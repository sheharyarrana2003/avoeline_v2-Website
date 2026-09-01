"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import { escapeHtml, sendEmail } from "@/src/lib/email";
import { RegService } from "@/src/services/registeration.service";
import type { EventModel } from "@/src/services/models/event.model";
import type { Registration, RegistrationStatus } from "@/src/services/models/reg.type";

/**
 * The status a registration should hold once it has a seat.
 *
 * Same precedence the initial write uses: money before vetting, vetting before
 * confirmation. Kept here so promotion and approval cannot disagree with
 * createPublicRegistration about what "has a seat" means.
 */
function seatedStatus(event: EventModel, reg: Registration): RegistrationStatus {
    if (Number(reg.payment?.amountPaid ?? 0) > 0 && reg.payment?.paymentStatus !== "completed") {
        return "awaiting_payment";
    }
    return event.access?.requiresApproval ? "pending" : "confirmed";
}

async function setStatus(reg: Registration, status: RegistrationStatus, extra: Record<string, unknown> = {}) {
    await adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(reg.registrationId).set(
        {
            status,
            statusHistory: [...(reg.statusHistory ?? []), { status, timestamp: new Date() }],
            updatedAt: new Date(),
            ...extra,
        },
        { merge: true },
    );
}

/**
 * Approve or reject a registration waiting on the organizer (spec 2.2).
 *
 * Only a `pending` registration can be decided: approving something already
 * confirmed is a no-op that would still append to the history and email the
 * attendee a second time.
 */
export async function decideRegistration(formData: FormData): Promise<ActionResult> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const registrationId = String(formData.get("registrationId") ?? "").trim();
        const decision = String(formData.get("decision") ?? "");
        if (!registrationId) return fail("Missing registration.");
        if (decision !== "approve" && decision !== "reject") return fail("Choose approve or reject.");

        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot decide registrations for that event.");

        const regs = await RegService.getRegsOfEvent(eventId);
        const reg = regs.find((r) => r.registrationId === registrationId);
        if (!reg) return fail("That registration no longer exists.");
        if (reg.status !== "pending") return fail("That registration has already been decided.");

        const approved = decision === "approve";
        await setStatus(reg, approved ? "confirmed" : "rejected");

        const email = reg.attendee?.email;
        if (email) {
            const ticketUrl = await absoluteUrl(`/events/${eventId}/ticket/${registrationId}`);
            await sendEmail(
                { email, name: reg.attendee?.name || undefined },
                {
                    subject: approved
                        ? `You're confirmed for ${event.title}`
                        : `About your registration for ${event.title}`,
                    html: approved
                        ? `<p>Your registration for <strong>${escapeHtml(event.title)}</strong> has been approved.</p>
<p><a href="${escapeHtml(ticketUrl)}">View your ticket</a></p>`
                        : `<p>Your registration for <strong>${escapeHtml(event.title)}</strong> was not approved by the organizer.</p>`,
                    senderName: event.title,
                },
            );
        }

        // Rejecting frees the seat that registration was holding.
        if (!approved) await promoteFromWaitlist(eventId);

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);
        return ok();
    } catch (err) {
        console.error("[decideRegistration]", err);
        return fail("Could not record that decision. Please try again.");
    }
}

/**
 * Move people off the waitlist into the seats that have opened up (spec 2.2).
 *
 * In order, oldest position first, and only as many as there are free seats.
 * Called after anything that frees a seat -- a cancellation, a rejection -- since
 * there are no background jobs here: promotion has to be a consequence of the
 * write that made room.
 *
 * Remaining positions are renumbered so the list stays 1..n rather than
 * developing gaps, which is what an attendee is shown.
 */
export async function promoteFromWaitlist(eventId: string): Promise<number> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return 0;

        const regs = await RegService.getRegsOfEvent(eventId);
        const waiting = regs
            .filter((r) => r.status === "waitlisted")
            .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));
        if (!waiting.length) return 0;

        const totalSeats = Number(event.capacity?.totalSeats) || 0;
        // Uncapped means everyone waiting can come in.
        const seatsTaken = regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected" && r.status !== "waitlisted").length;
        const free = totalSeats > 0 ? Math.max(0, totalSeats - seatsTaken) : waiting.length;
        if (!free) return 0;

        const promoted = waiting.slice(0, free);
        for (const reg of promoted) {
            await setStatus(reg, seatedStatus(event, reg), { waitlistPosition: 0 });
            const email = reg.attendee?.email;
            if (email) {
                const ticketUrl = await absoluteUrl(`/events/${eventId}/ticket/${reg.registrationId}`);
                await sendEmail(
                    { email, name: reg.attendee?.name || undefined },
                    {
                        subject: `A place has opened up at ${event.title}`,
                        html: `<p>Good news — a place at <strong>${escapeHtml(event.title)}</strong> has opened up and you are off the waitlist.</p>
<p><a href="${escapeHtml(ticketUrl)}">View your ticket</a></p>`,
                        senderName: event.title,
                    },
                );
            }
        }

        // Close the gaps the promotions left.
        const stillWaiting = waiting.slice(free);
        for (let i = 0; i < stillWaiting.length; i += 1) {
            if (stillWaiting[i].waitlistPosition !== i + 1) {
                await adminDb
                    .collection(COLLECTIONS.REGISTRATIONS)
                    .doc(stillWaiting[i].registrationId)
                    .set({ waitlistPosition: i + 1, updatedAt: new Date() }, { merge: true });
            }
        }

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);
        return promoted.length;
    } catch (err) {
        console.error("[promoteFromWaitlist]", { eventId, err });
        return 0;
    }
}
