import { cache } from "react";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";
import { EventModel } from "@/src/services/models/event.model";
import { UserService } from "@/src/services/user.service";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import {
    isAccountStatus,
    type AccountStatus,
    type EventReport,
    type ModerationEntry,
    type ModerationTarget,
    type OrganizerRow,
    type ReportStatus,
    type SupportTicket,
    type TicketStatus,
    type VendorRow,
} from "./types";

/**
 * The panel's reads (spec 9.2-9.7). Server only.
 *
 * Every one of these is a full-collection scan sorted in memory. That is the
 * same choice `platform.service.ts` already made and for the same reason:
 * `firebase deploy` is not available in this project and
 * `firestore.indexes.json` covers only events, registrations and bookings, so
 * no composite index can ever be created — which rules out `where` plus
 * `orderBy`. Two equality filters are fine, and the one filtered read below
 * uses exactly that.
 *
 * ponytail: at 5 organizers, 12 events and 2 vendors these are cheaper than the
 * pagination they would otherwise need. Ceiling: past a few hundred organizers
 * or a few thousand events, every table here wants a cursor and a real query.
 * The tables are already query-param driven, so that is a service change with
 * no UI rewrite behind it.
 */

/* ------------------------------------------------- organizers (spec 9.3) */

/**
 * Every organizer, with the three things the spec asks to show: signup date,
 * events run, and account status.
 *
 * Joined across three collections because none of them holds all three:
 * `organizer` has the signup date, `users` has the email and the standing, and
 * the count only exists by counting events. `getUsersByIds` batches the middle
 * one into a single round trip rather than a read per organizer.
 */
export const listOrganizers = cache(async (): Promise<OrganizerRow[]> => {
    const [orgSnap, eventSnap] = await Promise.all([
        adminDb.collection(COLLECTIONS.ORGANIZERS).get(),
        adminDb.collection(COLLECTIONS.EVENTS).get(),
    ]);

    const eventsByOrganizer = new Map<string, { total: number; live: number }>();
    for (const doc of eventSnap.docs) {
        const raw = doc.data();
        const key = String(raw?.organizerId ?? "");
        if (!key) continue;
        const bucket = eventsByOrganizer.get(key) ?? { total: 0, live: 0 };
        bucket.total += 1;
        if (isActiveLifecycle(eventLifecycle(raw?.status, raw?.schedule))) bucket.live += 1;
        eventsByOrganizer.set(key, bucket);
    }

    const ids = orgSnap.docs.map((d: QueryDocumentSnapshot) => String(d.data()?.userId || d.id));
    const users = await UserService.getUsersByIds(ids);

    return orgSnap.docs
        .map((doc: QueryDocumentSnapshot): OrganizerRow => {
            const raw = doc.data();
            const userId = String(raw?.userId || doc.id);
            const user = users.get(userId);
            const counts = eventsByOrganizer.get(doc.id) ?? eventsByOrganizer.get(userId) ?? { total: 0, live: 0 };
            const status = user?.accountStatus;
            return {
                organizerId: doc.id,
                userId,
                name: String(raw?.organization?.name || user?.profile?.fullName || "Unnamed organizer"),
                email: String(user?.email || raw?.contact?.primaryEmail || ""),
                signedUpAt: toIsoString(raw?.createdAt) || "",
                eventCount: counts.total,
                liveEventCount: counts.live,
                accountStatus: (isAccountStatus(status) ? status : "active") as AccountStatus,
            };
        })
        .sort((a: OrganizerRow, b: OrganizerRow) => a.name.localeCompare(b.name));
});

export const getOrganizerRow = cache(async (organizerId: string): Promise<OrganizerRow | null> => {
    const rows = await listOrganizers();
    return rows.find((r) => r.organizerId === organizerId || r.userId === organizerId) ?? null;
});

/* ----------------------------------------------------- events (spec 9.4) */

/**
 * Every event on the platform, including drafts, cancelled and private ones.
 *
 * Deliberately unlike `getBrowsableEvents`, which exists to hide exactly those
 * — an admin moderating content has to be able to see what a stranger cannot.
 */
export const listAllEvents = cache(async (): Promise<EventModel[]> => {
    const snap = await adminDb.collection(COLLECTIONS.EVENTS).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => EventModel.fromJson({ ...d.data(), eventId: d.id }))
        .sort((a: EventModel, b: EventModel) =>
            String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
        );
});

/* ---------------------------------------------------- vendors (spec 9.6) */

export const listVendors = cache(async (): Promise<VendorRow[]> => {
    const snap = await adminDb.collection(COLLECTIONS.VENDORS).get();
    return snap.docs
        .map((doc: QueryDocumentSnapshot): VendorRow => {
            const raw = doc.data();
            return {
                vendorId: String(raw?.vendorId || doc.id),
                businessName: String(raw?.businessName || "Unnamed vendor"),
                email: String(raw?.contact?.email || raw?.email || ""),
                // Untyped on the model and defaulted differently on either side
                // of the wire, so it is normalized once, here.
                status: String(raw?.status || "pending"),
                averageRating: Number(raw?.ratings?.averageRating ?? 0) || 0,
                totalReviews: Number(raw?.ratings?.totalReviews ?? 0) || 0,
                serviceCategories: Array.isArray(raw?.serviceCategories) ? raw.serviceCategories.map(String) : [],
                createdAt: toIsoString(raw?.createdAt) || "",
            };
        })
        .sort((a: VendorRow, b: VendorRow) => a.businessName.localeCompare(b.businessName));
});

/** One review an organizer left about a vendor, as the panel shows it. */
export interface VendorReviewRow {
    id: string;
    vendorId: string;
    rating: number;
    title: string;
    comment: string;
    reviewerName: string;
    createdAt: string;
}

/**
 * Every review organizers have left about vendors (spec 9.6's "ratings and
 * complaints").
 *
 * One equality filter on `targetType`, which Firestore serves without a
 * composite index; sorted in memory. Today reviews are only ever read one
 * vendor at a time by `getVendorReviews`, so this is the first platform-wide
 * view of them.
 *
 * Lowest ratings first, because that is what "complaints" means in practice —
 * there is no separate complaint record in this product, and inventing one the
 * spec does not describe would leave two half-used places to look.
 */
export const listVendorReviews = cache(async (): Promise<VendorReviewRow[]> => {
    const snap = await adminDb.collection(COLLECTIONS.FEEDBACK).where("targetType", "==", "vendor").get();
    return snap.docs
        .map((doc: QueryDocumentSnapshot): VendorReviewRow => {
            const raw = doc.data();
            return {
                id: doc.id,
                vendorId: String(raw?.targetId || raw?.vendorId || ""),
                rating: Number(raw?.rating ?? 0) || 0,
                title: String(raw?.title || ""),
                comment: String(raw?.comment || ""),
                reviewerName: String(raw?.reviewerName || "An organizer"),
                createdAt: toIsoString(raw?.createdAt) || "",
            };
        })
        .sort(
            (a: VendorReviewRow, b: VendorReviewRow) =>
                a.rating - b.rating || b.createdAt.localeCompare(a.createdAt),
        );
});

/* --------------------------------------------- flagged content (spec 9.4) */

function mapToReport(raw: any, fallbackId: string): EventReport {
    const status = String(raw?.status || "open");
    return {
        id: String(raw?.id || fallbackId),
        eventId: String(raw?.eventId || ""),
        eventTitle: String(raw?.eventTitle || "An event"),
        reason: String(raw?.reason || ""),
        reporterEmail: String(raw?.reporterEmail || ""),
        status: (["open", "dismissed", "actioned"].includes(status) ? status : "open") as ReportStatus,
        createdAt: toIsoString(raw?.createdAt) || "",
        decidedAt: toIsoString(raw?.decidedAt),
    };
}

/** Open reports first, then newest — an unreviewed flag must not sink. */
export const listEventReports = cache(async (): Promise<EventReport[]> => {
    const snap = await adminDb.collection(COLLECTIONS.EVENT_REPORTS).get();
    const rank: Record<ReportStatus, number> = { open: 0, actioned: 1, dismissed: 2 };
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToReport(d.data(), d.id))
        .sort(
            (a: EventReport, b: EventReport) =>
                rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt),
        );
});

/* --------------------------------------------- support tickets (spec 9.7) */

function mapToTicket(raw: any, fallbackId: string): SupportTicket {
    const status = String(raw?.status || "open");
    return {
        id: String(raw?.id || fallbackId),
        fromUserId: String(raw?.fromUserId || ""),
        fromEmail: String(raw?.fromEmail || ""),
        fromRole: String(raw?.fromRole || "attendee"),
        subject: String(raw?.subject || ""),
        body: String(raw?.body || ""),
        status: (["open", "in_progress", "resolved"].includes(status) ? status : "open") as TicketStatus,
        adminNote: String(raw?.adminNote || ""),
        createdAt: toIsoString(raw?.createdAt) || "",
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
}

export const listSupportTickets = cache(async (): Promise<SupportTicket[]> => {
    const snap = await adminDb.collection(COLLECTIONS.SUPPORT_TICKETS).get();
    return snap.docs.map((d: QueryDocumentSnapshot) => mapToTicket(d.data(), d.id));
});

/** The tickets one person filed, for their own "my requests" list. */
export async function ticketsForUser(userId: string): Promise<SupportTicket[]> {
    if (!userId) return [];
    const snap = await adminDb
        .collection(COLLECTIONS.SUPPORT_TICKETS)
        .where("fromUserId", "==", userId)
        .get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToTicket(d.data(), d.id))
        .sort((a: SupportTicket, b: SupportTicket) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------- the moderation log (spec 9.4) */

function mapToModeration(raw: any, fallbackId: string): ModerationEntry {
    return {
        id: String(raw?.id || fallbackId),
        targetType: (["event", "organizer", "vendor"].includes(String(raw?.targetType))
            ? raw.targetType
            : "event") as ModerationTarget,
        targetId: String(raw?.targetId || ""),
        targetLabel: String(raw?.targetLabel || ""),
        action: raw?.action,
        reason: String(raw?.reason || ""),
        adminId: String(raw?.adminId || ""),
        adminEmail: String(raw?.adminEmail || ""),
        createdAt: toIsoString(raw?.createdAt) || "",
    };
}

export const listModerationLog = cache(async (): Promise<ModerationEntry[]> => {
    const snap = await adminDb.collection(COLLECTIONS.MODERATION_LOG).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToModeration(d.data(), d.id))
        .sort((a: ModerationEntry, b: ModerationEntry) => b.createdAt.localeCompare(a.createdAt));
});

/** Everything ever done to one event, organizer or vendor. */
export async function moderationFor(targetId: string): Promise<ModerationEntry[]> {
    if (!targetId) return [];
    const snap = await adminDb.collection(COLLECTIONS.MODERATION_LOG).where("targetId", "==", targetId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToModeration(d.data(), d.id))
        .sort((a: ModerationEntry, b: ModerationEntry) => b.createdAt.localeCompare(a.createdAt));
}

/** One row of the owner's admin list. */
export interface AdminRecordRow {
    userId: string;
    email: string;
    name: string;
    isOwner: boolean;
    permissions: string[];
    accountStatus: string;
    createdAt: string;
}

/** Every stored admin, for the owner's admin list. */
export const listAdmins = cache(async (): Promise<AdminRecordRow[]> => {
    const snap = await adminDb.collection(COLLECTIONS.USERS).where("userType", "==", "admin").get();
    return snap.docs
        .map((doc: QueryDocumentSnapshot): AdminRecordRow => {
            const raw = doc.data();
            return {
                userId: doc.id,
                email: String(raw?.email || ""),
                name: String(raw?.profile?.fullName || ""),
                isOwner: !!raw?.isOwner,
                permissions: Array.isArray(raw?.adminPermissions) ? raw.adminPermissions.map(String) : [],
                accountStatus: String(raw?.accountStatus || "active"),
                createdAt: toIsoString(raw?.createdAt) || "",
            };
        })
        .sort((a: AdminRecordRow, b: AdminRecordRow) => a.email.localeCompare(b.email));
});
