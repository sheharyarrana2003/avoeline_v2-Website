import { cache } from "react";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";
import {
    isOrganizationType,
    type EventOrganization,
    type SponsorBenefit,
} from "./types";

function mapToBenefits(raw: any): SponsorBenefit[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((b) => b?.label)
        .map((b) => ({
            label: String(b.label),
            delivered: !!b.delivered,
            deliveredAt: toIsoString(b.deliveredAt),
        }));
}

function mapToOrganization(raw: any, id: string): EventOrganization {
    return {
        id: String(raw?.id || id || ""),
        eventId: String(raw?.eventId || ""),
        // An unrecognised type reads as `partner`, the one with no financial or
        // access implications -- a corrupt value must not grant anything.
        type: isOrganizationType(raw?.type) ? raw.type : "partner",
        name: String(raw?.name || ""),
        logoUrl: String(raw?.logoUrl || ""),
        websiteUrl: String(raw?.websiteUrl || ""),
        contactName: String(raw?.contactName || ""),
        contactEmail: String(raw?.contactEmail || ""),
        contactPhone: String(raw?.contactPhone || ""),

        tier: String(raw?.tier || ""),
        contractValue: Number(raw?.contractValue ?? 0),
        benefits: mapToBenefits(raw?.benefits),

        // Anything but an explicit "full" is treated as track-scoped, which
        // currently means no dashboard access at all -- the safe direction.
        role: raw?.role === "full" ? "full" : "track",
        userId: raw?.userId ? String(raw.userId) : null,
        invitedEmail: String(raw?.invitedEmail || "").trim().toLowerCase(),
        invitedAt: toIsoString(raw?.invitedAt),
        acceptedAt: toIsoString(raw?.acceptedAt),
        inviteToken: raw?.inviteToken ? String(raw.inviteToken) : null,
        trackId: String(raw?.trackId || ""),

        partnershipKind: String(raw?.partnershipKind || ""),
        sponsorTrackId: String(raw?.sponsorTrackId || ""),

        createdAt: toIsoString(raw?.createdAt),
        updatedAt: toIsoString(raw?.updatedAt),
    };
}

/** Every sponsor, collaborator and partner on one event. */
export const getEventOrganizations = cache(async (eventId: string): Promise<EventOrganization[]> => {
    if (!eventId) return [];
    try {
        const snap = await adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).where("eventId", "==", eventId).get();
        return snap.docs
            .map((d: QueryDocumentSnapshot) => mapToOrganization(d.data(), d.id))
            .sort((a: EventOrganization, b: EventOrganization) => a.name.localeCompare(b.name));
    } catch (err) {
        console.error("[getEventOrganizations] Firestore read failed", { eventId, err });
        throw new Error(`Failed to read organizations for ${eventId}`, { cause: err });
    }
});

/**
 * One collaborator invite by its token.
 *
 * Queried on the token alone, like the event invites: the token is the secret,
 * so the holder does not also have to prove which event it belongs to.
 */
export const findCollaboratorByToken = cache(async (token: string): Promise<EventOrganization | null> => {
    const clean = String(token ?? "").trim();
    if (!clean) return null;
    try {
        const snap = await adminDb
            .collection(COLLECTIONS.EVENT_ORGANIZATIONS)
            .where("inviteToken", "==", clean)
            .limit(1)
            .get();
        return snap.empty ? null : mapToOrganization(snap.docs[0].data(), snap.docs[0].id);
    } catch (err) {
        console.error("[findCollaboratorByToken] Firestore read failed", err);
        throw new Error("Failed to look up that invitation", { cause: err });
    }
});

/**
 * Events one person can reach as an accepted, full-access collaborator.
 *
 * The read behind collaborator authorization. `track`-role collaborators are
 * excluded: tracks arrive with the hackathon module, so there is nothing to
 * scope them to yet and granting them the whole dashboard would be wrong.
 */
export const getCollaboratingEventIds = cache(async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    try {
        const snap = await adminDb
            .collection(COLLECTIONS.EVENT_ORGANIZATIONS)
            .where("userId", "==", userId)
            .get();
        return snap.docs
            .map((d: QueryDocumentSnapshot) => mapToOrganization(d.data(), d.id))
            .filter((o: EventOrganization) => o.type === "collaborator" && o.role === "full" && !!o.acceptedAt)
            .map((o: EventOrganization) => o.eventId);
    } catch (err) {
        console.error("[getCollaboratingEventIds] Firestore read failed", { userId, err });
        return [];
    }
});
