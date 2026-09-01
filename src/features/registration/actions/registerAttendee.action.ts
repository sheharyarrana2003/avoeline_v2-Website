"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { ActionResult, fail } from "@/src/lib/action";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import { CERTIFICATES_BUCKET } from "@/data/supabase";
import { createPublicRegistration, getPublicEvent, isPaidEvent, recordCommunication } from "../registration.service";
import { sendRegistrationEmail } from "../registrationEmail";
import { absoluteUrl } from "@/src/lib/appUrl";
import { RegistrationRefusal } from "../types";

/**
 * What each refusal reads like to the person who just pressed the button.
 *
 * The service returns a reason code rather than a sentence so this stays the only
 * place wording lives, and so the service never has to care about phrasing.
 */
const REFUSAL_MESSAGE: Record<RegistrationRefusal, string> = {
    event_not_found: "This event is no longer open for registration.",
    event_closed: "Registration for this event has closed.",
    event_full: "This event is fully booked.",
    already_registered: "That email address is already registered for this event.",
    needs_code: "This is a private event. Enter the access code to register.",
    bad_code: "That access code is not right.",
    needs_invite: "This event is invite only. Please use the link you were sent.",
    invite_expired: "That invitation has expired.",
    invite_used: "That invitation has already been used.",
    // Deliberately does not confirm whether the address is on the list -- that
    // would let anyone test an event's guest list one address at a time.
    not_whitelisted: "That email address cannot register for this event.",
    tier_locked: "That ticket tier needs the access code for this event.",
};

/**
 * Where payment screenshots go, and why not the obvious bucket.
 *
 * A `payment-screenshots` bucket already exists on this project but is public-read,
 * and it already holds files written by something outside this repo -- nothing here
 * references it -- so flipping it private could break an unknown consumer. These are
 * photographs of people's bank and JazzCash transactions, so public-read is not an
 * option either.
 *
 * ponytail: parked in the existing PRIVATE certificates bucket under its own folder.
 * The name is untidy but the access level is correct, and correctness wins here.
 * Ceiling: proofs and certificates share a bucket. Upgrade path is one line -- once
 * `payment-screenshots` is confirmed private and its existing writer identified,
 * point PROOF_BUCKET at it and nothing else changes.
 */
const PROOF_BUCKET = CERTIFICATES_BUCKET;
const PROOF_FOLDER = "payment-proofs";

/** Deliberately generous for a phone photo, far below uploadMedia's 50MB ceiling. */
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/** Deliberately permissive. The real proof an address works is the email arriving. */
function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Register an attendee who has no account.
 *
 * Bound-arg-first signature: `bind(null, eventId)` leaves `(prevState, formData)`
 * for `useActionState`. Getting that order wrong is the classic way this pattern
 * breaks, and it fails at runtime rather than at compile time.
 *
 * This is a public endpoint by design -- no session, no role check. What replaces
 * authorization is that a caller can only ever create a registration against an
 * event the gate already accepts, and can supply nothing beyond their own contact
 * details. Every consequential field (price, tier, status, organizer) is derived
 * server-side from the event, never taken from the form.
 */
export async function registerAttendeeAction(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const phone = String(formData.get("phone") ?? "").trim();

        if (!name || !email || !phone) {
            return fail("Please fill in your name, email and phone number.");
        }
        if (name.length > 120) {
            return fail("That name is too long.");
        }
        if (!looksLikeEmail(email)) {
            return fail("That email address does not look right.");
        }

        // Access credentials travel with the form as hidden inputs, so the gate
        // can be re-decided here. They are re-checked rather than trusted: the
        // page that rendered this form proves nothing about who is submitting it.
        const attempt = {
            token: String(formData.get("inviteToken") ?? "").trim() || null,
            code: String(formData.get("accessCode") ?? "").trim() || null,
        };
        const tier = String(formData.get("tier") ?? "").trim();

        // Re-check the event here rather than trusting the page that rendered the
        // form: it may have been open when the page loaded and closed since.
        const event = await getPublicEvent(eventId);
        if (!event) return fail(REFUSAL_MESSAGE.event_not_found);

        // Optional even on a paid event: the requirement is that an attendee *can*
        // send proof, and refusing to register someone who has not paid yet would
        // lock out the exact person the awaiting_payment status exists for.
        let proofPath: string | null = null;
        const proof = formData.get("paymentProof");
        if (isPaidEvent(event) && proof instanceof File && proof.size > 0) {
            // Validated here rather than leaning on uploadMedia, which permits video
            // and 50MB. Checked before the upload so a bad file costs no storage.
            if (!proof.type.startsWith("image/")) {
                return fail("The payment proof needs to be an image.");
            }
            if (proof.size > MAX_PROOF_BYTES) {
                return fail("That image is too large. Please upload one under 5MB.");
            }

            const upload = new FormData();
            upload.append("file", proof);
            upload.append("folder", PROOF_FOLDER);
            upload.append("bucket", PROOF_BUCKET);

            const uploaded = await uploadMedia(upload);
            if (!uploaded.success) {
                console.error("[registerAttendeeAction] proof upload failed", uploaded.error);
                return fail("Your payment proof could not be uploaded. Please try again.");
            }
            // The storage key, not the signed URL uploadMedia also returns -- that URL
            // expires within the hour and would be a dead image by the time an
            // organizer opened it.
            proofPath = uploaded.path;
        }

        const headerList = await headers();
        const result = await createPublicRegistration(
            eventId,
            { name, email, phone, tier },
            {
                proofPath,
                metadata: {
                    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
                    userAgent: headerList.get("user-agent") ?? "",
                    deviceType: /mobile|android|iphone/i.test(headerList.get("user-agent") ?? "")
                        ? "mobile"
                        : "desktop",
                },
            },
            attempt,
        );

        if (!result.ok) return fail(REFUSAL_MESSAGE[result.refusal]);

        const ticketPath = `/events/${eventId}/ticket/${result.registrationId}`;

        // Awaited rather than fired and forgotten: this runtime does not guarantee
        // work outliving the response, so a floating promise here would be killed
        // mid-flight and the email would vanish. `sendRegistrationEmail` never
        // throws and returns null when it did not send, so the cost of waiting is
        // bounded and a failure cannot take the registration down with it.
        const sent = await sendRegistrationEmail(
            result.registration,
            result.event,
            await absoluteUrl(ticketPath),
        );
        if (sent) await recordCommunication(result.registrationId, sent);

        // So the organizer's attendee list shows the new registration rather than a
        // cached page without it.
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);

        redirect(ticketPath);
    } catch (err) {
        // redirect() reports itself by throwing. Swallowing it here would leave the
        // attendee staring at a form that appears to have done nothing.
        if (isRedirectError(err)) throw err;
        console.error("[registerAttendeeAction]", err);
        return fail("Something went wrong while registering you. Please try again.");
    }
}
