"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { ActionResult, fail } from "@/src/lib/action";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import { CERTIFICATES_BUCKET } from "@/data/supabase";
import { createPublicRegistration, getPublicEvent, isPaidEvent, recordCommunication } from "../registration.service";
import { getTrack, listTracks } from "@/src/features/hackathon/hackathon.service";
import { insertHackathonTeam } from "@/src/features/hackathon/actions/teams.action";
import { trackDueAmount } from "@/src/features/hackathon/types";
import { sendRegistrationEmail } from "../registrationEmail";
import { absoluteUrl } from "@/src/lib/appUrl";
import { RegistrationRefusal } from "../types";
import { readAnswers } from "@/src/lib/customFields";
import { missingRequired } from "@/src/features/taxonomy/types";
import { AuthService } from "@/src/features/auth/authService";
import { sendNotification } from "@/src/lib/notifications";
import { attachRegistrationsToGroup, createRegistrationGroup } from "@/src/features/registration_groups/groups.service";

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
    track_required: "Choose a competition to enter.",
    track_ended: "That competition has ended. Choose another one.",
};

/**
 * Payment proofs are stored in the private `certificates` bucket under
 * `payment-proofs/`. The `payment-screenshots` bucket is also private
 * (`PAYMENT_SCREENSHOTS_BUCKET`) for a later one-line switch.
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
        const promoCode = String(formData.get("promoCode") ?? "").trim();
        const ticketTierId = String(formData.get("ticketTierId") ?? "").trim();
        const tier = String(formData.get("tier") ?? "").trim();
        const trackId = String(formData.get("trackId") ?? "").trim();

        // Re-check the event here rather than trusting the page that rendered the
        // form: it may have been open when the page loaded and closed since.
        const event = await getPublicEvent(eventId);
        if (!event) return fail(REFUSAL_MESSAGE.event_not_found);

        const tracks = await listTracks(event.id);
        let amountDue = isPaidEvent(event) ? 1 : 0;
        if (tracks.length) {
            const track = tracks.find((t) => t.id === trackId) ?? (trackId ? await getTrack(trackId) : null);
            if (!track || track.eventId !== event.id) return fail(REFUSAL_MESSAGE.track_required);
            if (track.status === "ended") return fail(REFUSAL_MESSAGE.track_ended);
            amountDue = trackDueAmount(track);
        }

        // The event's own registration questions. Read against the stored
        // question list and validated here rather than trusting the form: the
        // `required` flag lives on the event, and a hand-made POST carries
        // whichever inputs it likes.
        const questions = event.registration?.customForm ?? [];
        const groupRegister = formData.get("groupRegister") === "1" && !!event.registration?.groupRegistration && !tracks.length;
        const leadQuestions = groupRegister ? questions : questions;
        const customResponses = readAnswers(formData, leadQuestions);
        const unanswered = missingRequired(leadQuestions, customResponses);
        if (unanswered.length) {
            return fail(`Please answer: ${unanswered.join(", ")}.`);
        }
        const memberQuestions = questions.filter((q) => q.askOnce !== "group");

        const teamName = String(formData.get("teamName") ?? "").trim();
        const memberPeople: { name: string; email: string; phone: string; customResponses: typeof customResponses }[] = [];
        if (tracks.length || groupRegister) {
            if (!teamName) return fail(groupRegister ? "Give your group a name." : "Give your team a name.");
            const track = tracks.length ? tracks.find((t) => t.id === trackId) ?? (await getTrack(trackId)) : null;
            const maxTeam = groupRegister
                ? event.registration?.groupMaxSize ?? 8
                : track?.maxTeamSize ?? 1;
            const minTeam = groupRegister ? event.registration?.groupMinSize ?? 2 : 1;
            const extraCount = Math.max(0, Math.min(Number(formData.get("memberCount") ?? 0) || 0, Math.max(0, maxTeam - 1)));
            if (groupRegister && extraCount + 1 < minTeam) {
                return fail(`This event needs groups of at least ${minTeam}.`);
            }
            const seen = new Set([email.toLowerCase()]);
            for (let i = 0; i < extraCount; i += 1) {
                const mName = String(formData.get(`member_${i}_name`) ?? "").trim();
                const mEmail = String(formData.get(`member_${i}_email`) ?? "").trim();
                const mPhone = String(formData.get(`member_${i}_phone`) ?? "").trim();
                if (!mName || !mEmail || !mPhone) return fail("Fill in every team member's name, email and phone.");
                if (!looksLikeEmail(mEmail)) return fail("A team member email does not look right.");
                if (seen.has(mEmail.toLowerCase())) return fail("Each team member needs a different email address.");
                seen.add(mEmail.toLowerCase());
                const memberAnswers = readAnswers(formData, memberQuestions, `member_${i}_custom_`);
                const memberMissing = missingRequired(memberQuestions, memberAnswers);
                if (memberMissing.length) {
                    return fail(`Please answer for ${mName}: ${memberMissing.join(", ")}.`);
                }
                memberPeople.push({ name: mName, email: mEmail, phone: mPhone, customResponses: memberAnswers });
            }
        }

        // Optional even on a paid event: the requirement is that an attendee *can*
        // send proof, and refusing to register someone who has not paid yet would
        // lock out the exact person the awaiting_payment status exists for.
        let proofPath: string | null = null;
        const proof = formData.get("paymentProof");
        if (amountDue > 0 && proof instanceof File && proof.size > 0) {
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
        // Registration is open to strangers, so this is a link when it can be
        // made and nothing when it cannot -- never a requirement.
        const signedIn = await AuthService.getCurrentUser().catch(() => null);
        const metadata = {
            ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
            userAgent: headerList.get("user-agent") ?? "",
            deviceType: /mobile|android|iphone/i.test(headerList.get("user-agent") ?? "")
                ? "mobile"
                : "desktop",
        };

        const result = await createPublicRegistration(
            eventId,
            { name, email, phone, tier, customResponses, promoCode, ticketTierId, trackId },
            {
                proofPath,
                userId: signedIn?.userId ?? null,
                metadata,
                hackathonRole: tracks.length ? "team_lead" : undefined,
                groupRole: groupRegister ? "lead" : undefined,
            },
            attempt,
        );

        if (!result.ok) return fail(REFUSAL_MESSAGE[result.refusal]);

        const teamMembers = [
            { registrationId: result.registrationId, name, email, isOwner: true },
        ];

        for (const person of memberPeople) {
            const extra = await createPublicRegistration(
                eventId,
                {
                    name: person.name,
                    email: person.email,
                    phone: person.phone,
                    customResponses: person.customResponses,
                    trackId,
                },
                {
                    userId: null,
                    metadata,
                    holdForTeamPayment: amountDue > 0,
                    skipCapacity: true,
                    hackathonRole: tracks.length ? "participant" : undefined,
                    groupRole: groupRegister ? "member" : undefined,
                },
                attempt,
            );
            if (!extra.ok) return fail(REFUSAL_MESSAGE[extra.refusal]);
            teamMembers.push({
                registrationId: extra.registrationId,
                name: person.name,
                email: person.email,
                isOwner: false,
            });
            const extraTicket = `/events/${eventId}/ticket/${extra.registrationId}`;
            const extraSent = await sendRegistrationEmail(
                extra.registration,
                extra.event,
                await absoluteUrl(extraTicket),
            );
            if (extraSent) await recordCommunication(extra.registrationId, extraSent);
        }

        if (groupRegister) {
            const group = await createRegistrationGroup({
                eventId: event.id,
                groupName: teamName,
                leadRegistrationId: result.registrationId,
                paymentStatus: amountDue > 0 ? "pending" : "completed",
                paymentProofPath: proofPath,
            });
            await attachRegistrationsToGroup(
                group.id,
                teamMembers.map((m) => m.registrationId),
            );
        }

        if (tracks.length) {
            const track = tracks.find((t) => t.id === trackId) ?? (await getTrack(trackId));
            const team = await insertHackathonTeam({
                eventId: event.id,
                organizerId: event.organizerId,
                trackId,
                name: teamName,
                members: teamMembers,
                maxTeamSize: track?.maxTeamSize ?? teamMembers.length,
                fee: amountDue,
                feeProofPath: proofPath,
            });
            if (!team.ok) return fail(team.error);
        }

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

        // Notifications Engine: notify attendee of confirmed registration
        if (result.registration.status === "confirmed") {
            const recipientUserId = result.registration.userId || email;
            await sendNotification(recipientUserId, "registration_confirmed", {
                attendeeName: name,
                eventTitle: result.event.title || "Event",
                eventId,
                ticketTier: tier || "General",
            }).catch((err) => console.error("[registerAttendeeAction] sendNotification error:", err));
        }

        // So the organizer's attendee list shows the new registration rather than a
        // cached page without it.
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);
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
