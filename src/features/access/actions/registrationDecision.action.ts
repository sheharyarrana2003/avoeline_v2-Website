"use server";

import { revalidatePath } from "next/cache";
import { adminDb, type Transaction, type DocumentSnapshot, type QueryDocumentSnapshot } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import { escapeHtml, sendEmail } from "@/src/lib/email";
import { RegService } from "@/src/services/registeration.service";
import type { EventModel } from "@/src/services/models/event.model";
import type { Registration, RegistrationStatus } from "@/src/services/models/reg.type";
import { sendNotification } from "@/src/lib/notifications";
import { maybeRevealHackathonAccessCodes } from "@/src/features/hackathon/accessCodes.service";

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
        if (approved) await maybeRevealHackathonAccessCodes(registrationId);

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
 * Executes a Firestore transaction that finds the waitlist doc with lowest position
 * for that event, creates a registration for them, and removes them from waitlist.
 */
export async function promoteWaitlistTransaction(eventId: string): Promise<{
    promoted: boolean;
    registrationId?: string;
    attendeeEmail?: string;
    attendeeName?: string;
    eventTitle?: string;
    status?: RegistrationStatus;
} | null> {
    try {
        const result = await adminDb.runTransaction(async (transaction: Transaction) => {
            // Find lowest position waitlist doc for this event
            const waitlistQuery = adminDb
                .collection(COLLECTIONS.WAITLIST)
                .where("eventId", "==", eventId)
                .orderBy("position", "asc")
                .limit(1);
            const waitlistSnap = await transaction.get(waitlistQuery);

            const eventRef = adminDb.collection(COLLECTIONS.EVENTS).doc(eventId);
            const eventDoc = (await transaction.get(eventRef)) as unknown as DocumentSnapshot;
            const eventData = (eventDoc.data() || {}) as Record<string, any>;
            const eventTitle = String(eventData.title || "Event");
            const approvalRequired = Boolean(eventData.approvalRequired ?? eventData.access?.requiresApproval);
            const promotedStatus: RegistrationStatus = approvalRequired ? "pending" : "confirmed";
            const now = new Date().toISOString();

            if (!waitlistSnap.empty) {
                const waitlistDoc = waitlistSnap.docs[0];
                const waitlistData = (waitlistDoc.data() || {}) as Record<string, any>;
                const targetId = waitlistDoc.id;

                const regRef = adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(targetId);
                const regDoc = (await transaction.get(regRef)) as unknown as DocumentSnapshot;

                if (regDoc.exists) {
                    const currentReg = (regDoc.data() || {}) as Record<string, any>;
                    transaction.update(regRef, {
                        status: promotedStatus,
                        waitlistPosition: 0,
                        statusHistory: [...(currentReg.statusHistory || []), { status: promotedStatus, timestamp: now }],
                        updatedAt: now,
                    });
                } else {
                    const newReg: Registration = {
                        registrationId: targetId,
                        eventId,
                        userId: waitlistData.userId || "",
                        attendee: waitlistData.attendee || { name: "", email: "", phone: "" },
                        organizerId: eventData.organizerId || "",
                        registrationDate: now,
                        registrationSource: "web",
                        status: promotedStatus,
                        statusHistory: [{ status: promotedStatus, timestamp: now }],
                        tier: waitlistData.tier || "General",
                        pricingTier: waitlistData.pricingTier || "General",
                        finalPrice: Number(waitlistData.finalPrice) || 0,
                        waitlistPosition: 0,
                        inviteId: null,
                        customResponses: waitlistData.customResponses || {},
                        hackathonTrackId: waitlistData.hackathonTrackId || null,
                        discountApplied: null,
                        payment: {
                            paymentId: "",
                            amountPaid: 0,
                            currency: eventData.pricing?.currency || "PKR",
                            paymentMethod: "free_ticket",
                            paymentStatus: "completed",
                            transactionId: null,
                            invoiceUrl: null,
                            proofPath: null,
                        },
                        checkIn: { checkedIn: false, checkInTime: null, checkInMethod: null, checkedInBy: null, deviceId: null },
                        qrCode: { data: "", imageUrl: "", scanCount: 0, lastScanned: null },
                        certificate: { type: "digital", issued: false, certificateId: null, issueDate: null, downloadUrl: null, sharedOnLinkedIn: false },
                        communications: [],
                        feedbackSubmitted: false,
                        rating: null,
                        reviewId: null,
                        metadata: { ipAddress: "", userAgent: "", deviceType: "desktop" },
                        createdAt: now,
                        updatedAt: now,
                        cancelledAt: null,
                    };
                    transaction.set(regRef, newReg);
                }

                // Remove from waitlist collection
                transaction.delete(waitlistDoc.ref);

                return {
                    promoted: true,
                    registrationId: targetId,
                    attendeeEmail: waitlistData.attendee?.email,
                    attendeeName: waitlistData.attendee?.name,
                    eventTitle,
                    status: promotedStatus,
                };
            }

            // Fallback for registrations table waitlisted entries
            const regWaitlistQuery = adminDb
                .collection(COLLECTIONS.REGISTRATIONS)
                .where("eventId", "==", eventId)
                .where("status", "==", "waitlisted")
                .orderBy("waitlistPosition", "asc")
                .limit(1);
            const regWaitlistSnap = await transaction.get(regWaitlistQuery);
            if (regWaitlistSnap.empty) {
                return { promoted: false };
            }

            const regDoc = regWaitlistSnap.docs[0];
            const currentReg = (regDoc.data() || {}) as Record<string, any>;
            transaction.update(regDoc.ref, {
                status: promotedStatus,
                waitlistPosition: 0,
                statusHistory: [...(currentReg.statusHistory || []), { status: promotedStatus, timestamp: now }],
                updatedAt: now,
            });

            return {
                promoted: true,
                registrationId: regDoc.id,
                attendeeEmail: currentReg.attendee?.email,
                attendeeName: currentReg.attendee?.name,
                eventTitle,
                status: promotedStatus,
            };
        });

        if (result?.promoted && result.attendeeEmail && result.registrationId) {
            // Renumber remaining waitlist docs in COLLECTIONS.WAITLIST
            try {
                const remainingWaitlist = await adminDb
                    .collection(COLLECTIONS.WAITLIST)
                    .where("eventId", "==", eventId)
                    .orderBy("position", "asc")
                    .get();

                if (!remainingWaitlist.empty) {
                    const batch = adminDb.batch();
                    remainingWaitlist.docs.forEach((doc: QueryDocumentSnapshot, idx: number) => {
                        const newPos = idx + 1;
                        if (doc.data().position !== newPos) {
                            batch.update(doc.ref, { position: newPos, updatedAt: new Date().toISOString() });
                        }
                    });
                    await batch.commit();
                }
            } catch (err) {
                console.error("[promoteWaitlistTransaction] renumbering error", err);
            }

            // Send notification email
            const ticketUrl = await absoluteUrl(`/events/${eventId}/ticket/${result.registrationId}`);
            await sendEmail(
                { email: result.attendeeEmail, name: result.attendeeName },
                {
                    subject: `A place has opened up at ${result.eventTitle}`,
                    html: `<p>Good news — a place at <strong>${escapeHtml(result.eventTitle || "the event")}</strong> has opened up and you are off the waitlist.</p>
<p><a href="${escapeHtml(ticketUrl)}">View your ticket</a></p>`,
                    senderName: result.eventTitle,
                },
            );

            // Notifications Engine: trigger waitlist_promoted notification
            await sendNotification(
                result.registrationId || result.attendeeEmail,
                "waitlist_promoted",
                {
                    attendeeName: result.attendeeName || "Attendee",
                    eventTitle: result.eventTitle || "Event",
                    eventId,
                },
            ).catch((err) => console.error("[promoteWaitlistTransaction] sendNotification error:", err));
        }

        return result;
    } catch (err) {
        console.error("[promoteWaitlistTransaction] transaction failed", { eventId, err });
        return null;
    }
}

/**
 * Move people off the waitlist into the seats that have opened up.
 * Calls promoteWaitlistTransaction atomically.
 */
export async function promoteFromWaitlist(eventId: string): Promise<number> {
    try {
        const res = await promoteWaitlistTransaction(eventId);
        if (res?.promoted) {
            const eventDoc = await adminDb.collection(COLLECTIONS.EVENTS).doc(eventId).get();
            const organizerId = eventDoc.data()?.organizerId;
            if (organizerId) {
                revalidatePath(`/organizer/${organizerId}/events/${eventId}/attendees`);
            }
            return 1;
        }
        return 0;
    } catch (err) {
        console.error("[promoteFromWaitlist]", { eventId, err });
        return 0;
    }
}

/**
 * Action to cancel a registration, triggering waitlist promotion.
 */
export async function cancelRegistrationAction(formData: FormData): Promise<ActionResult> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const registrationId = String(formData.get("registrationId") ?? "").trim();
        if (!eventId || !registrationId) return fail("Missing event or registration ID.");

        const regRef = adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId);
        const regDoc = await regRef.get();
        if (!regDoc.exists) return fail("Registration not found.");

        const now = new Date().toISOString();
        await regRef.update({
            status: "cancelled",
            cancelledAt: now,
            statusHistory: [
                ...(Array.isArray((regDoc.data() as { statusHistory?: unknown })?.statusHistory)
                    ? ((regDoc.data() as { statusHistory: unknown[] }).statusHistory)
                    : []),
                { status: "cancelled", timestamp: now },
            ],
            updatedAt: now,
        });

        // Trigger waitlist promotion transaction
        await promoteWaitlistTransaction(eventId);

        const eventDoc = await adminDb.collection(COLLECTIONS.EVENTS).doc(eventId).get();
        const organizerId = eventDoc.data()?.organizerId;
        if (organizerId) {
            revalidatePath(`/organizer/${organizerId}/events/${eventId}/attendees`);
        }
        revalidatePath(`/events/${eventId}`);
        return ok();
    } catch (err) {
        console.error("[cancelRegistrationAction]", err);
        return fail("Could not cancel registration.");
    }
}
