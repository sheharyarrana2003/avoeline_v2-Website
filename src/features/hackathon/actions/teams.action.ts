"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
/**
 * `data/admin_db.ts` builds Firestore through `require()`, so `adminDb` is
 * untyped and everything off it is `any`. These are the repo's first
 * transactions, so the refs are annotated here: without a typed
 * `DocumentReference`, `tx.get()` resolves to the Query overload and hands back
 * a QuerySnapshot that has no `.exists`.
 */
import type { DocumentReference, Query, Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { CERTIFICATES_BUCKET } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { assertParticipant } from "@/src/features/events/ownership";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import {
    getTrack,
    joinCodeTaken,
    findTeamByJoinCode,
    mapToTeam,
    teamsForRegistration,
} from "../hackathon.service";
import {
    canJoin,
    deadlinePassed,
    feeBlocksSubmission,
    isSkillTag,
    JOIN_REFUSAL_MESSAGE,
    makeJoinCode,
    normalizeJoinCode,
    rosterLocked,
    type HackathonTeam,
    type HackathonTeamMember,
} from "../types";

/**
 * Team formation and submission, spec 3.2 and 3.3. Participant side.
 *
 * There is no session here. Every action takes `(eventId, registrationId)` as
 * **bound arguments from the route**, never from a form field, and hands them to
 * `assertParticipant` which re-reads both documents and refuses a pair that does
 * not belong together. A registration id posted in a form could be swapped for
 * somebody else's; a bound argument cannot.
 *
 * Membership is capped inside a Firestore transaction, not by a read-then-write.
 * Two people redeeming the same code for the last seat both pass an `if` before
 * either commits, and `arrayUnion` prevents duplicates but caps nothing.
 */

const DECK_FOLDER = "track-submissions";
const FEE_FOLDER = "track-fees";
const MAX_DECK_BYTES = 25 * 1024 * 1024;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/** Refusals the transaction throws, so the outer catch can tell them from bugs. */
class Refused extends Error {}

function refuse(message: string): never {
    throw new Refused(message);
}

/** Only http(s) links, so a stored value can never be a `javascript:` URL. */
function safeUrl(raw: unknown, label: string): string {
    const value = String(raw ?? "").trim();
    if (!value) return "";
    if (!/^https?:\/\//i.test(value)) refuse(`The ${label} needs to start with http:// or https://`);
    if (value.length > 500) refuse(`That ${label} is too long.`);
    return value;
}

function pickSkills(formData: FormData): string[] {
    // Driven by the known tag list, so an invented tag never reaches Firestore.
    return formData.getAll("skills").map(String).filter(isSkillTag).slice(0, 10);
}

function memberOf(team: HackathonTeam, registrationId: string): HackathonTeamMember | undefined {
    return team.members.find((m) => m.registrationId === registrationId);
}

/** Where a participant's own surfaces live, for revalidation. */
function participantPaths(eventId: string, registrationId: string): string[] {
    return [`/events/${eventId}/ticket/${registrationId}`, `/events/${eventId}/ticket/${registrationId}/team`];
}

function revalidateAll(eventId: string, registrationId: string, organizerId: string, trackId: string) {
    for (const path of participantPaths(eventId, registrationId)) revalidatePath(path);
    revalidatePath(`/organizer/${organizerId}/events/${eventId}/hackathon/${trackId}`);
    revalidatePath(`/organizer/${organizerId}/events/${eventId}/hackathon`);
}

/* ------------------------------------------------------------ create a team */

export async function createTeam(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const trackId = String(formData.get("trackId") ?? "").trim();
        const track = trackId ? await getTrack(trackId) : null;
        if (!track || track.eventId !== who.event.id) return fail("Pick a track for this event.");

        const name = String(formData.get("name") ?? "").trim();
        if (!name) return fail("Give your team a name.");
        if (name.length > 80) return fail("That team name is too long.");

        // A locked roster cannot gain a new team either -- otherwise the lock
        // would be trivially sidestepped by starting a fresh one.
        if (rosterLocked(track, { unlockedByOrganizer: false })) {
            return fail("Team registration for this track has closed.");
        }

        const mine = await teamsForRegistration(registrationId);
        if (mine.some((t) => t.trackId === track.id)) {
            return fail(JOIN_REFUSAL_MESSAGE.already_in_another_team);
        }

        // Minted before the write and checked for a clash. 31^6 codes makes a
        // collision remote, and the check makes acting on one impossible.
        let joinCode = "";
        for (let attempt = 0; attempt < 6 && !joinCode; attempt += 1) {
            const candidate = makeJoinCode();
            if (!(await joinCodeTaken(candidate))) joinCode = candidate;
        }
        if (!joinCode) return fail("Could not allocate a join code. Please try again.");

        const now = new Date();
        const ref = adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc();
        const member: HackathonTeamMember = {
            registrationId,
            // Taken from the registration, not the form: this is who they are.
            name: who.registration.attendee?.name || "Participant",
            email: who.registration.attendee?.email || "",
            skills: pickSkills(formData),
            isOwner: true,
            joinedAt: now.toISOString(),
        };

        await ref.create({
            id: ref.id,
            eventId: who.event.id,
            trackId: track.id,
            organizerId: who.event.organizerId,
            name,
            joinCode,
            members: [member],
            memberRegistrationIds: [registrationId],
            // Copied so the join transaction reads one document, not two.
            maxTeamSize: track.maxTeamSize,
            lookingForMembers: track.maxTeamSize > 1,
            unlockedByOrganizer: false,
            submission: { repoUrl: "", demoVideoUrl: "", description: "", deckPath: "", deckName: "", submittedAt: null },
            feeStatus: track.fee > 0 ? "fee_pending" : "not_required",
            feeProofPath: "",
            round: 1,
            eliminatedAtRound: null,
            scores: {},
            createdAt: now,
            updatedAt: now,
        });

        revalidateAll(who.event.id, registrationId, who.event.organizerId, track.id);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        if (err instanceof Refused) return fail(err.message);
        console.error("[createTeam]", err);
        return fail("Could not create that team. Please try again.");
    }
}

/* -------------------------------------------------------------- join a team */

export async function joinTeam(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const code = normalizeJoinCode(formData.get("joinCode"));
        if (!code) return fail("Enter the join code your team shared with you.");

        const found = await findTeamByJoinCode(code);
        const track = found ? await getTrack(found.trackId) : null;
        const mine = await teamsForRegistration(registrationId);

        // Decided once here so the form can show a specific refusal, and again
        // inside the transaction against freshly read documents. One rule, two
        // callers -- the message and the enforcement cannot drift apart.
        const decision = canJoin({
            eventId: who.event.id,
            registrationId,
            team: found,
            track,
            currentTeamTrackId: mine.find((t) => t.trackId === found?.trackId)?.trackId ?? null,
        });
        if (!decision.allowed) return fail(JOIN_REFUSAL_MESSAGE[decision.reason]);
        if (!found || !track) return fail(JOIN_REFUSAL_MESSAGE.no_such_code);

        const teamRef: DocumentReference = adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(found.id);
        const now = new Date();
        const member: HackathonTeamMember = {
            registrationId,
            name: who.registration.attendee?.name || "Participant",
            email: who.registration.attendee?.email || "",
            skills: pickSkills(formData),
            isOwner: false,
            joinedAt: now.toISOString(),
        };

        await adminDb.runTransaction(async (tx: Transaction) => {
            const snap = await tx.get(teamRef);
            if (!snap.exists) refuse(JOIN_REFUSAL_MESSAGE.no_such_code);
            const fresh = mapToTeam(snap.data(), snap.id);

            // Read inside the transaction as well, so somebody joining two teams
            // in the same track from two tabs loses the second one rather than
            // ending up on both.
            const mineQuery: Query = adminDb
                .collection(COLLECTIONS.HACKATHON_TEAMS)
                .where("memberRegistrationIds", "array-contains", registrationId);
            const alreadySnap = await tx.get(mineQuery);
            const alreadyInTrack = alreadySnap.docs
                .map((d) => mapToTeam(d.data(), d.id))
                .find((t: HackathonTeam) => t.trackId === fresh.trackId);

            const again = canJoin({
                eventId: who.event.id,
                registrationId,
                team: fresh,
                track,
                currentTeamTrackId: alreadyInTrack?.trackId ?? null,
            });
            if (!again.allowed) refuse(JOIN_REFUSAL_MESSAGE[again.reason]);

            const members = [...fresh.members, member];
            tx.update(teamRef, {
                members,
                // Written together with `members` so the queryable mirror can
                // never disagree with the roster it mirrors.
                memberRegistrationIds: members.map((m) => m.registrationId),
                lookingForMembers: members.length < fresh.maxTeamSize && fresh.lookingForMembers,
                updatedAt: now,
            });
        });

        revalidateAll(who.event.id, registrationId, who.event.organizerId, found.trackId);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        if (err instanceof Refused) return fail(err.message);
        console.error("[joinTeam]", err);
        return fail("Could not join that team. Please try again.");
    }
}

/* ------------------------------------------------------------- leave a team */

export async function leaveTeam(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const teamId = String(formData.get("teamId") ?? "").trim();
        const teamRef: DocumentReference = adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId);
        const now = new Date();
        let trackId = "";

        await adminDb.runTransaction(async (tx: Transaction) => {
            const snap = await tx.get(teamRef);
            if (!snap.exists) refuse("That team no longer exists.");
            const team = mapToTeam(snap.data(), snap.id);
            if (team.eventId !== who.event.id) refuse("That team is not on this event.");
            if (!memberOf(team, registrationId)) refuse("You are not in that team.");
            trackId = team.trackId;

            const track = await getTrack(team.trackId);
            if (track && rosterLocked(track, team)) refuse(JOIN_REFUSAL_MESSAGE.roster_locked);

            const members = team.members.filter((m) => m.registrationId !== registrationId);
            if (members.length === 0) {
                // The last member out deletes the team rather than leaving an
                // empty one holding a join code and a name nobody can reuse.
                tx.delete(teamRef);
                return;
            }
            // Somebody has to own it, or the team is left with no owner at all.
            if (!members.some((m) => m.isOwner)) members[0] = { ...members[0], isOwner: true };
            tx.update(teamRef, {
                members,
                memberRegistrationIds: members.map((m) => m.registrationId),
                updatedAt: now,
            });
        });

        revalidateAll(who.event.id, registrationId, who.event.organizerId, trackId);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        if (err instanceof Refused) return fail(err.message);
        console.error("[leaveTeam]", err);
        return fail("Could not leave that team. Please try again.");
    }
}

/* ------------------------------------------------- skills and availability */

export async function updateTeamPrefs(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const teamId = String(formData.get("teamId") ?? "").trim();
        const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get();
        if (!snap.exists) return fail("That team no longer exists.");
        const team = mapToTeam(snap.data(), snap.id);
        if (team.eventId !== who.event.id) return fail("That team is not on this event.");
        if (!memberOf(team, registrationId)) return fail("You are not in that team.");

        // Skills and "looking for members" are not roster changes, so the lock
        // does not apply: a locked team may still describe itself.
        const skills = pickSkills(formData);
        const members = team.members.map((m) => (m.registrationId === registrationId ? { ...m, skills } : m));
        const lookingForMembers = formData.has("lookingForMembers")
            ? String(formData.get("lookingForMembers")) === "true"
            : team.lookingForMembers;

        await adminDb
            .collection(COLLECTIONS.HACKATHON_TEAMS)
            .doc(team.id)
            .set({ members, lookingForMembers, updatedAt: new Date() }, { merge: true });

        revalidateAll(who.event.id, registrationId, who.event.organizerId, team.trackId);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[updateTeamPrefs]", err);
        return fail("Could not save that. Please try again.");
    }
}

/* ------------------------------------------------------------- submit (3.3) */

export async function submitProject(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const teamId = String(formData.get("teamId") ?? "").trim();
        const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get();
        if (!snap.exists) return fail("That team no longer exists.");
        const team = mapToTeam(snap.data(), snap.id);
        if (team.eventId !== who.event.id) return fail("That team is not on this event.");
        // Any member may submit. Restricting it to the owner means a team cannot
        // hand in its work because one person is asleep.
        if (!memberOf(team, registrationId)) return fail("You are not in that team.");

        const track = await getTrack(team.trackId);
        if (!track) return fail("That track no longer exists.");
        if (deadlinePassed(track)) return fail("The submission deadline for this track has passed.");
        if (feeBlocksSubmission(track, team)) {
            return fail("The organiser has not confirmed this track's entry fee for your team yet.");
        }

        const repoUrl = safeUrl(formData.get("repoUrl"), "repository link");
        const demoVideoUrl = safeUrl(formData.get("demoVideoUrl"), "demo video link");
        const description = String(formData.get("description") ?? "").trim().slice(0, 4000);

        let deckPath = team.submission.deckPath;
        let deckName = team.submission.deckName;
        const deck = formData.get("deck");
        if (deck instanceof File && deck.size > 0) {
            if (deck.size > MAX_DECK_BYTES) return fail("That deck is too large. Please keep it under 25MB.");
            const upload = new FormData();
            upload.append("file", deck);
            upload.append("folder", DECK_FOLDER);
            upload.append("bucket", CERTIFICATES_BUCKET);
            const uploaded = await uploadMedia(upload);
            if (!uploaded.success) {
                console.error("[submitProject] deck upload failed", uploaded.error);
                return fail(uploaded.error || "That deck could not be uploaded.");
            }
            deckPath = uploaded.path;
            deckName = deck.name;
        }

        if (!repoUrl && !demoVideoUrl && !description && !deckPath) {
            return fail("Add at least one of a repository link, a demo video, a deck or a description.");
        }

        await adminDb
            .collection(COLLECTIONS.HACKATHON_TEAMS)
            .doc(team.id)
            .set(
                {
                    submission: {
                        repoUrl,
                        demoVideoUrl,
                        description,
                        deckPath,
                        deckName,
                        // Set once and kept: this is when the team first handed
                        // in, not when they last edited it.
                        submittedAt: team.submission.submittedAt ?? new Date(),
                    },
                    updatedAt: new Date(),
                },
                { merge: true },
            );

        revalidateAll(who.event.id, registrationId, who.event.organizerId, team.trackId);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        if (err instanceof Refused) return fail(err.message);
        console.error("[submitProject]", err);
        return fail("Could not save your submission. Please try again.");
    }
}

/* ---------------------------------------------------------- the track's fee */

export async function uploadFeeProof(
    eventId: string,
    registrationId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const who = await assertParticipant(eventId, registrationId);
        if (!who) return fail("That registration is not valid for this event.");

        const teamId = String(formData.get("teamId") ?? "").trim();
        const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get();
        if (!snap.exists) return fail("That team no longer exists.");
        const team = mapToTeam(snap.data(), snap.id);
        if (team.eventId !== who.event.id) return fail("That team is not on this event.");
        if (!memberOf(team, registrationId)) return fail("You are not in that team.");

        const proof = formData.get("proof");
        if (!(proof instanceof File) || proof.size === 0) return fail("Choose a screenshot of your transfer.");
        if (!proof.type.startsWith("image/")) return fail("The proof needs to be an image.");
        if (proof.size > MAX_PROOF_BYTES) return fail("That image is too large. Please upload one under 5MB.");

        const upload = new FormData();
        upload.append("file", proof);
        upload.append("folder", FEE_FOLDER);
        upload.append("bucket", CERTIFICATES_BUCKET);
        const uploaded = await uploadMedia(upload);
        if (!uploaded.success) {
            console.error("[uploadFeeProof] upload failed", uploaded.error);
            return fail(uploaded.error || "That image could not be uploaded.");
        }

        await adminDb
            .collection(COLLECTIONS.HACKATHON_TEAMS)
            .doc(team.id)
            .set(
                {
                    feeProofPath: uploaded.path,
                    // Uploading proof is a claim, not a confirmation. Only the
                    // organizer moves this to paid, exactly as they verify a
                    // registration's payment.
                    feeStatus: team.feeStatus === "fee_paid" ? "fee_paid" : "fee_pending",
                    updatedAt: new Date(),
                },
                { merge: true },
            );

        revalidateAll(who.event.id, registrationId, who.event.organizerId, team.trackId);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[uploadFeeProof]", err);
        return fail("Could not upload that. Please try again.");
    }
}
