"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { escapeHtml, sendBulkEmail, type Recipient } from "@/src/lib/email";
import { absoluteUrl } from "@/src/lib/appUrl";
import { OrganizerService } from "@/src/services/organizer.service";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { assertOwnedEvent, assertParticipant } from "@/src/features/events/ownership";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { getTrack, listTeams, mapToMentor, mapToTeam } from "../hackathon.service";
import { isExpertise, livestreamUnsupported, parseSlotLines, slotIsOpen } from "../live";

/**
 * Live-event tools and online mode (spec 3.4 and 3.5).
 *
 * Three different callers here, each with its own credential: the organizer
 * (`assertOwnedEvent`), a participant acting from their ticket link
 * (`assertParticipant`), and a would-be mentor who is nobody at all -- their
 * sign-up is gated on the event's own access rule instead, so a private
 * hackathon's mentor form is as private as the event.
 */

const MAX_ANNOUNCEMENT = 4000;

/* ------------------------------------------------- announcements (3.4) */

/**
 * Post an announcement, and optionally email it.
 *
 * Stored once and shown to everybody it applies to, rather than written per
 * recipient. The email leg matters because most participants have no account
 * and therefore no in-app inbox -- the notification system is keyed to a user
 * id, so for an account-less registrant email is the only push channel there is.
 */
export async function postAnnouncement(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot post to that event.");

        const title = String(formData.get("title") ?? "").trim();
        const body = String(formData.get("body") ?? "").trim();
        if (!title) return fail("Give the announcement a title.");
        if (!body) return fail("Write something to announce.");

        const trackId = String(formData.get("trackId") ?? "").trim();
        const track = trackId ? await getTrack(trackId) : null;
        if (trackId && (!track || track.eventId !== event.id)) {
            return fail("That track does not belong to this event.");
        }

        // Who this reaches. A track-scoped announcement goes to the people on
        // that track's teams; a hackathon-wide one goes to every registrant.
        const regs = await RegService.getRegsOfEvent(event.id);
        const live = regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected");
        let audience = live;
        if (track) {
            const teams = await listTeams(track.id);
            const onTrack = new Set(teams.flatMap((t) => t.memberRegistrationIds));
            audience = live.filter((r) => onTrack.has(r.registrationId));
        }

        const usersById = audience.length
            ? await UserService.getUsersByIds(audience.map((r) => r.userId).filter(Boolean))
            : new Map();

        const recipients: Recipient[] = [];
        for (const reg of audience) {
            const user = usersById.get(String(reg.userId));
            const email = (user?.email || reg.attendee?.email || "").trim();
            if (email) {
                recipients.push({ email, name: user?.profile?.fullName || reg.attendee?.name || undefined });
            }
        }

        const shouldEmail = String(formData.get("sendEmail") ?? "") === "true";
        let emailedCount = 0;

        if (shouldEmail && recipients.length) {
            const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
            const link = await absoluteUrl(`/events/${event.id}/tracks`);
            const outcome = await sendBulkEmail(recipients, {
                subject: `${event.title}: ${title}`,
                senderName: organizer?.organization?.name?.trim(),
                html: `<p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(body).replace(/\n/g, "<br />")}</p><p><a href="${link}">Open the hackathon</a></p>`,
                text: `${title}\n\n${body}\n\n${link}`,
            });
            emailedCount = outcome.sent;
        }

        const ref: DocumentReference = adminDb.collection(COLLECTIONS.HACKATHON_ANNOUNCEMENTS).doc();
        await ref.set({
            id: ref.id,
            eventId: event.id,
            trackId: track?.id ?? "",
            title: title.slice(0, 160),
            body: body.slice(0, MAX_ANNOUNCEMENT),
            // Recorded from the send's own result, so "emailed" on the screen is
            // never a claim about mail that did not go.
            emailedCount,
            createdAt: new Date(),
        });

        revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/hackathon`);
        revalidatePath(`/events/${event.id}/tracks`);
        return {
            success: true,
            ...(shouldEmail && !emailedCount && recipients.length
                ? { error: "Posted, but the mail provider sent nothing — check the email configuration." }
                : {}),
        };
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[postAnnouncement]", err);
        return fail("Could not post that announcement. Please try again.");
    }
}

export async function removeAnnouncement(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) redirect("/");
        backTo = `/organizer/${event.organizerId}/events/${event.id}/hackathon`;

        const id = String(formData.get("announcementId") ?? "").trim();
        const snap = id ? await adminDb.collection(COLLECTIONS.HACKATHON_ANNOUNCEMENTS).doc(id).get() : null;
        if (snap?.exists && String(snap.data()?.eventId) === event.id) {
            await adminDb.collection(COLLECTIONS.HACKATHON_ANNOUNCEMENTS).doc(id).delete();
        }
        revalidatePath(backTo);
        redirect(backTo);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[removeAnnouncement]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not remove that announcement.")}`);
    }
}

/* -------------------------------------------------------- mentors (3.4) */

/**
 * A mentor signs themselves up with the hours they are free.
 *
 * The one write in this module with no signed-in caller behind it, so it is
 * gated on the event's own access decision: on a private hackathon the code is
 * required here exactly as it is to register. That is what stops the form being
 * an open door for anybody who finds the URL.
 */
export async function signUpMentor(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const code = String(formData.get("accessCode") ?? "").trim() || null;
        const { event, access } = await getEventForVisitor(eventId, { code });
        if (!event) return fail("This event is no longer open.");
        if (!access.allowed) return fail("This hackathon is private. Enter its access code first.");

        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim().toLowerCase();
        if (!name) return fail("Please give your name.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("That email address does not look right.");

        const expertise = formData.getAll("expertise").map(String).filter(isExpertise).slice(0, 10);
        const slots = parseSlotLines(formData.get("slots"));
        if (!slots.length) {
            return fail("Add at least one time slot, as a date, a start time and an end time.");
        }

        // Matched on email so somebody signing up twice updates their hours
        // rather than appearing as two mentors.
        const existingSnap = await adminDb
            .collection(COLLECTIONS.HACKATHON_MENTORS)
            .where("eventId", "==", event.id)
            .get();
        const existing = existingSnap.docs.find(
            (d: { data: () => Record<string, unknown> }) => String(d.data()?.email ?? "").toLowerCase() === email,
        );

        const now = new Date();
        const ref: DocumentReference = existing
            ? adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).doc(existing.id)
            : adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).doc();

        // Re-parsed against what is already stored, so a mentor tidying their
        // hours cannot cancel a slot a team has already booked.
        const merged = existing ? parseSlotLines(formData.get("slots"), mapToMentor(existing.data(), existing.id).slots) : slots;

        await ref.set(
            {
                id: ref.id,
                eventId: event.id,
                name,
                email,
                expertise,
                bio: String(formData.get("bio") ?? "").trim().slice(0, 1000),
                slots: merged,
                ...(existing ? {} : { createdAt: now }),
                updatedAt: now,
            },
            { merge: true },
        );

        revalidatePath(`/events/${event.id}/mentors`);
        revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/hackathon`);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[signUpMentor]", err);
        return fail("Could not sign you up. Please try again.");
    }
}

/**
 * A team books a mentor slot.
 *
 * A transaction over the mentor document, because two teams clicking the same
 * slot is the obvious race and the loser must be told rather than silently
 * overwriting the winner.
 */
export async function bookMentorSlot(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const mentorId = String(formData.get("mentorId") ?? "").trim();
        const slotId = String(formData.get("slotId") ?? "").trim();
        const teamId = String(formData.get("teamId") ?? "").trim();
        if (!mentorId || !slotId || !teamId) return fail("Pick a slot to book.");

        const teamSnap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get();
        if (!teamSnap.exists) return fail("That team no longer exists.");
        const team = mapToTeam(teamSnap.data(), teamSnap.id);
        if (team.eventId !== who.event.id) return fail("That team is not on this event.");
        if (!team.memberRegistrationIds.includes(registrationId)) return fail("You are not in that team.");

        const mentorRef: DocumentReference = adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).doc(mentorId);
        let outcome: ActionResult = ok();

        await adminDb.runTransaction(async (tx: Transaction) => {
            const snap = await tx.get(mentorRef);
            if (!snap.exists) {
                outcome = fail("That mentor is no longer listed.");
                return;
            }
            const mentor = mapToMentor(snap.data(), snap.id);
            if (mentor.eventId !== who.event.id) {
                outcome = fail("That mentor is not on this event.");
                return;
            }

            const slot = mentor.slots.find((s) => s.id === slotId);
            if (!slot) {
                outcome = fail("That slot is no longer listed.");
                return;
            }
            if (!slotIsOpen(slot)) {
                outcome = fail(
                    slot.bookedByTeamId ? "Somebody has just taken that slot." : "That slot has already passed.",
                );
                return;
            }
            // One slot per mentor per team, so a team cannot hold a mentor's
            // whole day while others get none.
            if (mentor.slots.some((s) => s.bookedByTeamId === team.id)) {
                outcome = fail(`Your team already has a slot with ${mentor.name}.`);
                return;
            }

            const slots = mentor.slots.map((s) =>
                s.id === slotId
                    ? { ...s, bookedByTeamId: team.id, bookedTeamName: team.name, bookedAt: new Date() }
                    : s,
            );
            tx.update(mentorRef, { slots, updatedAt: new Date() });
        });

        revalidatePath(`/events/${who.event.id}/ticket/${registrationId}/team`);
        revalidatePath(`/events/${who.event.id}/mentors`);
        return outcome;
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[bookMentorSlot]", err);
        return fail("Could not book that slot. Please try again.");
    }
}

/** Give a slot back. Only the team holding it may cancel it. */
export async function cancelMentorSlot(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const mentorId = String(formData.get("mentorId") ?? "").trim();
        const slotId = String(formData.get("slotId") ?? "").trim();
        const teamId = String(formData.get("teamId") ?? "").trim();

        const teamSnap = teamId ? await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get() : null;
        if (!teamSnap?.exists) return fail("That team no longer exists.");
        const team = mapToTeam(teamSnap.data(), teamSnap.id);
        if (!team.memberRegistrationIds.includes(registrationId)) return fail("You are not in that team.");

        const mentorRef: DocumentReference = adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).doc(mentorId);
        let outcome: ActionResult = ok();

        await adminDb.runTransaction(async (tx: Transaction) => {
            const snap = await tx.get(mentorRef);
            if (!snap.exists) {
                outcome = fail("That mentor is no longer listed.");
                return;
            }
            const mentor = mapToMentor(snap.data(), snap.id);
            const slot = mentor.slots.find((s) => s.id === slotId);
            if (!slot || slot.bookedByTeamId !== team.id) {
                outcome = fail("Your team does not hold that slot.");
                return;
            }
            const slots = mentor.slots.map((s) =>
                s.id === slotId ? { ...s, bookedByTeamId: "", bookedTeamName: "", bookedAt: null } : s,
            );
            tx.update(mentorRef, { slots, updatedAt: new Date() });
        });

        revalidatePath(`/events/${who.event.id}/ticket/${registrationId}/team`);
        revalidatePath(`/events/${who.event.id}/mentors`);
        return outcome;
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[cancelMentorSlot]", err);
        return fail("Could not cancel that slot. Please try again.");
    }
}

export async function removeMentor(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) redirect("/");
        backTo = `/organizer/${event.organizerId}/events/${event.id}/hackathon`;

        const id = String(formData.get("mentorId") ?? "").trim();
        const snap = id ? await adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).doc(id).get() : null;
        if (snap?.exists && String(snap.data()?.eventId) === event.id) {
            await adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).doc(id).delete();
        }
        revalidatePath(backTo);
        revalidatePath(`/events/${eventId}/mentors`);
        redirect(backTo);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[removeMentor]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not remove that mentor.")}`);
    }
}

/* ---------------------------------------------------- online mode (3.5) */

/**
 * Spec 3.5's switch: run the whole hackathon virtually.
 *
 * An unembeddable livestream link is a **warning, not a refusal**, and that is
 * a deliberate correction. Refusing the whole form over the link silently threw
 * away the organizer's "run online" choice: React resets a checkbox when the
 * action's re-render lands, so the tick was gone while the typed link stayed,
 * and fixing the link then saved with online mode still off. Verified happening.
 *
 * Saving the link as typed is safe because nothing renders it raw -- the
 * spectator page only ever passes it through `embedUrl`, which returns "" for
 * anything that is not a YouTube or Zoom embed form. The safety is at render,
 * where it belongs, so this can afford to be forgiving.
 */
export async function saveHackathonSettings(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change that event.");

        const livestreamUrl = String(formData.get("livestreamUrl") ?? "").trim().slice(0, 500);

        await adminDb
            .collection(COLLECTIONS.HACKATHON_SETTINGS)
            .doc(event.id)
            .set(
                {
                    eventId: event.id,
                    onlineMode: String(formData.get("onlineMode") ?? "") === "true",
                    livestreamUrl,
                    updatedAt: new Date(),
                },
                { merge: true },
            );

        revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/hackathon`);
        revalidatePath(`/events/${event.id}/tracks`);
        revalidatePath(`/events/${event.id}/tracks/[trackId]/leaderboard`, "page");
        return {
            success: true,
            ...(livestreamUnsupported(livestreamUrl)
                ? {
                      error: "Saved. That link will not embed, though — the spectator page shows no stream until it is a YouTube or Zoom link.",
                  }
                : {}),
        };
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[saveHackathonSettings]", err);
        return fail("Could not save those settings. Please try again.");
    }
}
