import { cache } from "react";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { EventService } from "@/src/services/event.service";
import { RegService, mapToRegistration } from "@/src/services/registeration.service";
import { EventModel } from "@/src/services/models/event.model";
import { Registration } from "@/src/services/models/reg.type";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { PublicRegistrationInput, RegistrationRefusal } from "./types";

/** What `createPublicRegistration` hands back. */
export type CreateRegistrationResult =
    | { ok: true; registrationId: string }
    | { ok: false; refusal: RegistrationRefusal };

/** A registration counts against capacity unless it was withdrawn. */
function occupiesASeat(reg: Registration): boolean {
    return reg.status !== "cancelled";
}

/**
 * Whether an event charges for entry.
 *
 * Two fields carry price and they disagree in live data: `pricing.isFree` is set
 * by the wizard, `PriceOfTicket` is a separate top-level number, and tiers can
 * carry their own prices. Treating any positive price as paid is the safe read --
 * charging nobody is a worse failure than showing an upload box on a free event.
 */
export function isPaidEvent(event: EventModel): boolean {
    if (event.pricing?.isFree) return false;
    const tierPrice = event.pricing?.tiers?.reduce((max, t) => Math.max(max, Number(t.price) || 0), 0) ?? 0;
    return (Number(event.PriceOfTicket) || 0) > 0 || tierPrice > 0;
}

/** The price we record against a registration. */
export function ticketPrice(event: EventModel): number {
    if (!isPaidEvent(event)) return 0;
    const tierPrice = event.pricing?.tiers?.reduce((max, t) => Math.max(max, Number(t.price) || 0), 0) ?? 0;
    return Number(event.PriceOfTicket) || tierPrice || 0;
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

    // Private and invite-only events are not registrable from a shared link.
    // `accessCode` exists on the model for invite-only flows; nothing implements
    // it yet, so those events stay unreachable rather than silently public.
    if (String(event.visibility || "").toLowerCase() !== "public") return null;

    if (!isActiveLifecycle(eventLifecycle(event.status, event.schedule))) return null;

    return event;
});

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
        /** Filled in by the QR step; absent on a free registration created before it runs. */
        qrCode?: { data: string; imageUrl: string };
        metadata?: { ipAddress: string; userAgent: string; deviceType: string };
    },
): Promise<CreateRegistrationResult> {
    const event = await getPublicEvent(eventId);
    if (!event) return { ok: false, refusal: "event_not_found" };

    // One read serves both guards below.
    const existing = await RegService.getRegsOfEvent(eventId);

    const email = input.email.trim().toLowerCase();
    const alreadyHere = existing.some(
        (r) => occupiesASeat(r) && (r.attendee?.email || "").trim().toLowerCase() === email,
    );
    if (alreadyHere) return { ok: false, refusal: "already_registered" };

    // Counted live rather than read from `capacity.availableSeats`, which is
    // written once at event creation and never moves -- it is already stale in
    // main. totalSeats of 0 means uncapped.
    const totalSeats = Number(event.capacity?.totalSeats) || 0;
    if (totalSeats > 0 && existing.filter(occupiesASeat).length >= totalSeats) {
        return { ok: false, refusal: "event_full" };
    }

    const ref = adminDb.collection(COLLECTIONS.REGISTRATIONS).doc();
    const now = new Date().toISOString();
    const paid = isPaidEvent(event);
    const price = ticketPrice(event);

    // Paid registrations are not confirmed until an organizer verifies the
    // screenshot; free ones have nothing to verify.
    const status = paid ? "awaiting_payment" : "confirmed";

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
        payment: {
            paymentId: "",
            // What they owe, not what we have confirmed receiving -- paymentStatus
            // carries that, and an organizer flips it after seeing the screenshot.
            amountPaid: paid ? price : 0,
            currency: event.pricing?.currency || "PKR",
            paymentMethod: paid ? "bank_transfer" : "free_ticket",
            paymentStatus: paid ? "pending" : "completed",
            transactionId: null,
            invoiceUrl: null,
            proofPath: extras?.proofPath ?? null,
        },
        pricingTier: event.pricing?.tiers?.[0]?.name || "General",
        finalPrice: price,
        discountApplied: null,
        checkIn: { checkedIn: false, checkInTime: null, checkInMethod: null, checkedInBy: null, deviceId: null },
        qrCode: {
            data: extras?.qrCode?.data || "",
            imageUrl: extras?.qrCode?.imageUrl || "",
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

    return { ok: true, registrationId: ref.id };
}
