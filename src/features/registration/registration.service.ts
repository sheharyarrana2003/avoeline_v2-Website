import { cache } from "react";
import { adminDb } from "@/data/admin_db";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";
import { EventService } from "@/src/services/event.service";
import { RegService, mapToRegistration } from "@/src/services/registeration.service";
import { EventModel } from "@/src/services/models/event.model";
import { Registration, CommunicationLog } from "@/src/services/models/reg.type";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { PublicRegistrationInput, RegistrationRefusal } from "./types";
import { buildQrPayload, generateAndHostQr } from "./qr";
import { resolveEventAccess, type AccessAttempt } from "@/src/features/access/access.service";
import type { AccessDenial } from "@/src/features/access/types";
import type { RegistrationStatus } from "@/src/services/models/reg.type";
import { sanitizeAnswers } from "@/src/lib/customFields";

/**
 * One refusal code per access denial, so the form explains what is missing
 * instead of collapsing everything into "event not found".
 */
const ACCESS_REFUSAL: Record<AccessDenial, RegistrationRefusal> = {
    not_found: "event_not_found",
    closed: "event_closed",
    needs_code: "needs_code",
    bad_code: "bad_code",
    needs_invite: "needs_invite",
    invite_expired: "invite_expired",
    invite_used: "invite_used",
    not_whitelisted: "not_whitelisted",
};

/**
 * Which tier this registration gets.
 *
 * An invite or guest-list row wins: the organizer set it deliberately per
 * person. Otherwise the attendee's own choice counts only when the event allows
 * self-selection AND the tier is one the event actually offers -- the value
 * arrives from a form, so an unlisted tier is either a stale page or someone
 * editing the request. Failing that, the first configured tier.
 */
function resolveTier(event: EventModel, entitled: string, requested?: string): string {
    const offered = event.access?.attendeeTiers ?? [];
    if (entitled) return entitled;
    if (event.access?.allowTierSelfSelect && requested && offered.includes(requested)) return requested;
    return offered[0] ?? "";
}

/** What `createPublicRegistration` hands back. */
export type CreateRegistrationResult =
    | { ok: true; registrationId: string; registration: Registration; event: EventModel }
    | { ok: false; refusal: RegistrationRefusal };

/** A registration counts against capacity unless it was withdrawn. */
function occupiesASeat(reg: Registration): boolean {
    return reg.status !== "cancelled";
}

/**
 * The tier an attendee is buying and its price, resolved together.
 *
 * Live data states the price twice and the two disagree on four of the five
 * published events: `PriceOfTicket` is a loose top-level number while each entry
 * in `pricing.tiers` carries its own. Taking the amount from one and the label
 * from the other stamped registrations "Early Bird Pass" at a price that was not
 * the Early Bird price -- 1500 against a tier that reads 1000. Both values leave
 * this function from the same object so they cannot drift apart again.
 *
 * A priced tier wins, because it is the only place a name and an amount are
 * stated together. `PriceOfTicket` is the fallback and gets a generic label
 * rather than borrowing a tier's name it does not match.
 */
export function ticketFor(event: EventModel): { tierName: string; price: number } {
    if (event.pricing?.isFree) return { tierName: "General", price: 0 };

    // The first tier with a real price, not the highest: a zero-priced lead tier
    // should not be read as "this event is free", and picking the max would pair
    // one tier's name with another tier's amount.
    const tier = event.pricing?.tiers?.find((t) => (Number(t.price) || 0) > 0);
    if (tier) return { tierName: tier.name || "General", price: Number(tier.price) || 0 };

    return { tierName: "General", price: Number(event.PriceOfTicket) || 0 };
}

/** Whether an event charges for entry. */
export function isPaidEvent(event: EventModel): boolean {
    return ticketFor(event).price > 0;
}

/**
 * An event as a stranger is allowed to see it, or null.
 *
 * Gated on visibility and lifecycle, deliberately NOT on
 * `registration.registrationCloseDate`. Stored event dates in this project are
 * genuinely inconsistent -- some documents hold DD/MM/YYYY and some MM/DD/YYYY --
 * so a date comparison would close registration on the wrong day for some events
 * and never close it for others. `eventLifecycle` derives position from the
 * schedule and is the same reasoning the rest of the app already uses.
 *
 * `cache()`d because the page and its form both need the event within one request.
 */
export const getPublicEvent = cache(async (eventId: string): Promise<EventModel | null> => {
    if (!eventId) {
        console.warn("[getPublicEvent] called with empty eventId");
        return null;
    }

    const event = await EventService.getEventByID(eventId);
    if (!event) return null;

    if (!isActiveLifecycle(eventLifecycle(event.status, event.schedule))) return null;

    return event;
});

/**
 * The event a visitor is allowed to see, with the access decision attached.
 *
 * Replaces the old rule inside `getPublicEvent`, which denied anything that was
 * not `public` and so 404'd a private event on its own direct link. Access is
 * now `resolveEventAccess`'s job; this only fetches and hands the visitor's
 * credentials over.
 *
 * The event is returned even when access is refused, because the page needs to
 * render a code-entry form for it -- the caller must check `access.allowed`
 * before showing anything else about the event.
 */
export const getEventForVisitor = cache(
    async (
        eventId: string,
        attempt: AccessAttempt = {},
    ): Promise<{ event: EventModel | null; access: Awaited<ReturnType<typeof resolveEventAccess>> }> => {
        const event = eventId ? await EventService.getEventByID(eventId) : null;
        const access = await resolveEventAccess(event, attempt);
        return { event, access };
    },
);

/** One registration by id, for the ticket page. */
export const getRegistrationById = cache(async (registrationId: string): Promise<Registration | null> => {
    if (!registrationId) {
        console.warn("[getRegistrationById] called with empty registrationId");
        return null;
    }

    try {
        const snap = await adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId).get();
        if (!snap.exists) return null;
        return mapToRegistration(snap.data(), snap.id);
    } catch (err) {
        console.error("[getRegistrationById] Firestore read failed", { registrationId, err });
        throw new Error(`Failed to fetch registration ${registrationId}`, { cause: err });
    }
});

/**
 * Create a registration for someone with no account.
 *
 * Writes one new document and touches nothing else. In particular it does not
 * maintain `event.analytics.registrations` or `event.capacity.availableSeats`:
 * the organizer's event page derives both live from this collection (see the
 * "stale denormalized counters" note there), so writing them would update fields
 * nothing reads.
 *
 * The document ref is allocated before the write so `ref.id` can be embedded in
 * the QR payload -- the same trick `event.service.ts` uses for event ids.
 */
export async function createPublicRegistration(
    eventId: string,
    input: PublicRegistrationInput,
    extras?: {
        /** Storage key of the uploaded payment screenshot, if any. */
        proofPath?: string | null;
        metadata?: { ipAddress: string; userAgent: string; deviceType: string };
    },
    /** Access credentials the visitor presented: an invite token, a code. */
    attempt: AccessAttempt = {},
): Promise<CreateRegistrationResult> {
    const email = input.email.trim().toLowerCase();

    // The register-time gate. Unlike the page view this knows the email, so the
    // guest list is enforced here -- and the whole decision is re-made server
    // side rather than trusting anything the form implies about access.
    const event = await EventService.getEventByID(eventId);
    const access = await resolveEventAccess(event, { ...attempt, email });
    if (!event) return { ok: false, refusal: "event_not_found" };
    if (!access.allowed) return { ok: false, refusal: ACCESS_REFUSAL[access.reason] };

    // One read serves the guards below.
    const existing = await RegService.getRegsOfEvent(eventId);

    const alreadyHere = existing.some(
        (r) => occupiesASeat(r) && (r.attendee?.email || "").trim().toLowerCase() === email,
    );
    if (alreadyHere) return { ok: false, refusal: "already_registered" };

    const tier = resolveTier(event, access.tier, input.tier);
    if (access.lockedTiers.includes(tier)) return { ok: false, refusal: "tier_locked" };

    // Counted live rather than read from `capacity.availableSeats`, which is
    // written once at event creation and never moves -- it is already stale in
    // main. totalSeats of 0 means uncapped.
    const totalSeats = Number(event.capacity?.totalSeats) || 0;
    const seatsTaken = existing.filter(occupiesASeat).length;
    const full = totalSeats > 0 && seatsTaken >= totalSeats;

    // A full event now offers the waitlist instead of a dead end, when the
    // organizer turned it on. Without it the behaviour is the old refusal.
    if (full && !event.access?.waitlistEnabled) {
        return { ok: false, refusal: "event_full" };
    }
    const waitlistPosition = full ? existing.filter((r) => r.status === "waitlisted").length + 1 : 0;

    const ref = adminDb.collection(COLLECTIONS.REGISTRATIONS).doc();
    const now = new Date().toISOString();

    // Generated before the write so the document carries its QR from the outset
    // rather than needing a second write to attach one. Returns null on failure,
    // which leaves qrCode empty: a registration without a QR is recoverable, a
    // lost registration is not.
    const qr = await generateAndHostQr(
        buildQrPayload({ name: input.name.trim(), eventId: event.id, registrationId: ref.id, timestamp: now }),
    );
    const ticket = ticketFor(event);
    const paid = ticket.price > 0;

    /*
     * Status precedence, most binding first:
     *   waitlisted      -- there is no seat, so nothing else applies yet
     *   awaiting_payment-- money is owed; approval comes after it clears
     *   pending         -- the organizer vets registrations (spec 2.2)
     *   confirmed       -- nothing stands in the way
     */
    const status: RegistrationStatus = full
        ? "waitlisted"
        : paid
          ? "awaiting_payment"
          : event.access?.requiresApproval
            ? "pending"
            : "confirmed";

    const registration: Registration = {
        registrationId: ref.id,
        eventId: event.id,
        userId: "",
        attendee: { name: input.name.trim(), email, phone: input.phone.trim() },
        organizerId: event.organizerId,
        registrationDate: now,
        registrationSource: "web",
        status,
        statusHistory: [{ status, timestamp: now }],
        tier,
        waitlistPosition,
        inviteId: access.entry?.id ?? null,
        // Cleaned against the event's own question list rather than stored as
        // submitted: this is a public endpoint, so an unknown key here would be
        // arbitrary attacker-chosen data landing in the organizer's export.
        customResponses: sanitizeAnswers(event.registration?.customForm ?? [], input.customResponses),
        payment: {
            paymentId: "",
            // What they owe, not what we have confirmed receiving -- paymentStatus
            // carries that, and an organizer flips it after seeing the screenshot.
            amountPaid: ticket.price,
            currency: event.pricing?.currency || "PKR",
            paymentMethod: paid ? "bank_transfer" : "free_ticket",
            paymentStatus: paid ? "pending" : "completed",
            transactionId: null,
            invoiceUrl: null,
            proofPath: extras?.proofPath ?? null,
        },
        pricingTier: ticket.tierName,
        finalPrice: ticket.price,
        discountApplied: null,
        checkIn: { checkedIn: false, checkInTime: null, checkInMethod: null, checkedInBy: null, deviceId: null },
        qrCode: {
            data: qr?.data || "",
            imageUrl: qr?.imageUrl || "",
            scanCount: 0,
            lastScanned: null,
        },
        certificate: {
            type: "digital",
            issued: false,
            certificateId: null,
            issueDate: null,
            downloadUrl: null,
            sharedOnLinkedIn: false,
        },
        // Stays empty until a confirmation email genuinely goes out. Recording a
        // "sent" entry for mail we never sent would make the organizer's
        // communication history lie.
        communications: [],
        feedbackSubmitted: false,
        rating: null,
        reviewId: null,
        metadata: {
            ipAddress: extras?.metadata?.ipAddress || "",
            userAgent: extras?.metadata?.userAgent || "",
            deviceType: extras?.metadata?.deviceType || "desktop",
        },
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
    };

    try {
        await ref.set(registration);
    } catch (err) {
        console.error("[createPublicRegistration] Firestore write failed", { eventId, err });
        throw new Error(`Failed to create registration for event ${eventId}`, { cause: err });
    }

    // Spec 2.2: an invite tracks whether the person it was sent to registered.
    // After the registration, and never throwing -- the registration exists and
    // must not be lost because a tracking write failed.
    if (access.entry) {
        try {
            await adminDb.collection(COLLECTIONS.EVENT_INVITES).doc(access.entry.id).set(
                { registeredAt: new Date(), registrationId: ref.id, updatedAt: new Date() },
                { merge: true },
            );
        } catch (err) {
            console.error("[createPublicRegistration] could not mark the invite as used", {
                inviteId: access.entry.id,
                err,
            });
        }
    }

    return { ok: true, registrationId: ref.id, registration, event };
}

/**
 * Record that a confirmation email actually went out.
 *
 * A separate write rather than part of the create, because the email can only be
 * sent once the registration exists and its ticket URL is known. `communications[]`
 * is already rendered by the organizer's attendee drawer as "Communication
 * history", and has been permanently empty until now.
 *
 * `arrayUnion` rather than assignment so a later entry cannot clobber an earlier
 * one. Swallows its own failures: the email has already been delivered by this
 * point, and failing to write the audit line is not worth surfacing to someone who
 * has just registered successfully.
 */
export async function recordCommunication(registrationId: string, log: CommunicationLog): Promise<void> {
    try {
        await adminDb
            .collection(COLLECTIONS.REGISTRATIONS)
            .doc(registrationId)
            .update({ communications: FieldValue.arrayUnion(log), updatedAt: new Date().toISOString() });
    } catch (err) {
        console.error("[recordCommunication] could not append the log", { registrationId, err });
    }
}
