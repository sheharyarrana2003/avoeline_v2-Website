"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb, type DocumentReference } from "@/data/admin_db";
import { COLLECTIONS, TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { sendEmail } from "@/src/lib/email";
import { absoluteUrl } from "@/src/lib/appUrl";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { OrganizerService } from "@/src/services/organizer.service";
import {
    findJudgeByToken,
    getTrack,
    judgesForTrack,
    listTeams,
    listTracks,
    mapToTeam,
} from "../hackathon.service";
import { hackathonDashPath, hackathonTrackManagePath, organizerHackathonCachePaths } from "../kinds";
import {
    advanceSelection,
    parseRubricLines,
    rankTeams,
    roundKey,
    scoreCard,
    type HackathonJudge,
} from "../judging";

/**
 * Rubric, judges, scoring and rounds (spec 3.3).
 *
 * Two different callers, two different credentials. The organizer's actions go
 * through `assertOwnedEvent`. The judge's single action is authorized by the
 * unguessable token in their link and nothing else -- there is no account
 * behind a judge, and the token is re-read here rather than trusted from a
 * form, so the only thing a caller can act as is the judge whose link they
 * hold.
 */

/** Two UUIDs with the dashes stripped, matching how collaborator invites mint. */
function mintToken(): string {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/* ------------------------------------------------------------ the rubric */

/**
 * Save a track's rubric (spec 3.3's rubric builder).
 *
 * Rewritten wholesale from the textarea, so a category that disappears from the
 * text is gone. Scores already given keep their own copy of the numbers, so a
 * later rubric edit cannot retroactively change a card a judge submitted --
 * only what the leaderboard's maximum is measured against.
 */
export async function saveRubric(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change that event.");

        const trackId = String(formData.get("trackId") ?? "").trim();
        const track = trackId ? await getTrack(trackId) : null;
        if (!track || track.eventId !== event.id) return fail("That track does not belong to this event.");

        const rubric = parseRubricLines(formData.get("rubric"));

        await adminDb
            .collection(COLLECTIONS.HACKATHON_TRACKS)
            .doc(track.id)
            .set({ rubric, updatedAt: new Date() }, { merge: true });

        revalidatePath(hackathonTrackManagePath(event.organizerId, event.id, track.id));
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[saveRubric]", err);
        return fail("Could not save the rubric. Please try again.");
    }
}

/* ------------------------------------------------------------- the judges */

/**
 * Invite a judge to one or more tracks, or update the tracks of an existing one.
 *
 * Matched on the email so re-inviting the same person changes their tracks
 * rather than creating a second judge with a second link. The token is only
 * minted once, so an earlier link keeps working -- unlike the collaborator
 * invite, which re-issues, because that one is spent on acceptance and this one
 * has nothing to accept.
 */
export async function inviteJudge(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change that event.");

        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim().toLowerCase();
        if (!name) return fail("Give the judge a name.");
        if (!looksLikeEmail(email)) return fail("That email address does not look right.");

        const trackIds = formData.getAll("trackIds").map(String).filter(Boolean);
        if (!trackIds.length) return fail("Choose at least one track for them to judge.");

        // Only tracks of this event, so a track id from elsewhere cannot be
        // attached to a judge by editing the form.
        const tracks = await listTracks(event.id);
        const valid = trackIds.filter((id) => tracks.some((t) => t.id === id));
        if (!valid.length) return fail("Those tracks do not belong to this event.");

        const existingSnap = await adminDb
            .collection(COLLECTIONS.HACKATHON_JUDGES)
            .where("eventId", "==", event.id)
            .get();
        const existing = existingSnap.docs.find(
            (d: { data: () => Record<string, unknown> }) => String(d.data()?.email ?? "").toLowerCase() === email,
        );

        const now = new Date();
        const ref: DocumentReference = existing
            ? adminDb.collection(COLLECTIONS.HACKATHON_JUDGES).doc(existing.id)
            : adminDb.collection(COLLECTIONS.HACKATHON_JUDGES).doc();
        const token = existing ? String(existing.data()?.inviteToken || "") || mintToken() : mintToken();

        await ref.set(
            {
                id: ref.id,
                eventId: event.id,
                organizerId: event.organizerId,
                name,
                email,
                trackIds: valid,
                inviteToken: token,
                invitedAt: existing?.data()?.invitedAt ?? now,
                ...(existing ? {} : { lastScoredAt: null, createdAt: now }),
                updatedAt: now,
            },
            { merge: true },
        );

        // Shown as the organizer, sent as us -- the SPF/DKIM reasoning lives in
        // sendEmail. Failure to send does not fail the invite: the organizer can
        // copy the link from the page.
        const link = await absoluteUrl(`/judge/${token}`);
        const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
        const named = tracks.filter((t) => valid.includes(t.id)).map((t) => t.name).join(", ");
        await sendEmail(
            { email, name },
            {
                subject: `You're judging ${event.title}`,
                senderName: organizer?.organization?.name?.trim(),
                html: `<p>Hi ${name},</p><p>You have been asked to judge <strong>${event.title}</strong> (${named}).</p><p><a href="${link}">Open your scoring page</a></p><p>That link is yours alone — it needs no password, so please do not forward it.</p>`,
                text: `Hi ${name},\n\nYou have been asked to judge ${event.title} (${named}).\n\nYour scoring page: ${link}\n\nThat link is yours alone — it needs no password, so please do not forward it.`,
            },
        );

        for (const path of organizerHackathonCachePaths(event.organizerId, event.id)) revalidatePath(path);
        for (const id of valid) {
            revalidatePath(hackathonTrackManagePath(event.organizerId, event.id, id));
        }
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[inviteJudge]", err);
        return fail("Could not invite that judge. Please try again.");
    }
}

/**
 * Revoke a judge's access.
 *
 * The judge document is deleted, which closes their link. Scores they already
 * gave stay on the teams: withdrawing somebody's access is not the same as
 * deleting the judging that has already happened, and a leaderboard that
 * silently changed because a judge was removed would be worse.
 */
export async function removeJudge(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) redirect("/");
        backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

        const judgeId = String(formData.get("judgeId") ?? "").trim();
        const snap = judgeId ? await adminDb.collection(COLLECTIONS.HACKATHON_JUDGES).doc(judgeId).get() : null;
        if (!snap?.exists || String(snap.data()?.eventId) !== event.id) {
            redirect(`${backTo}?e=${encodeURIComponent("That judge is not on this event.")}`);
        }

        await adminDb.collection(COLLECTIONS.HACKATHON_JUDGES).doc(judgeId).delete();
        revalidatePath(backTo);
        redirect(backTo);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[removeJudge]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not remove that judge.")}`);
    }
}

/* ------------------------------------------------------------- scoring */

/**
 * A judge scores one team (spec 3.3's scoring interface).
 *
 * Authorized purely by the token, re-read from Firestore. The score lands at
 * `scores.<judgeId>.<roundKey>` through a merge write on that one nested key,
 * so two judges scoring the same team at the same moment do not overwrite each
 * other -- which a whole-object write of `scores` would.
 */
export async function submitScore(
    token: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const judge = await findJudgeByToken(token);
        if (!judge || !judge.inviteToken) return fail("That judging link is no longer valid.");

        const teamId = String(formData.get("teamId") ?? "").trim();
        const snap = teamId ? await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get() : null;
        if (!snap?.exists) return fail("That team no longer exists.");

        const team = mapToTeam(snap.data(), snap.id);
        if (team.eventId !== judge.eventId) return fail("That team is not on your event.");
        if (!judge.trackIds.includes(team.trackId)) return fail("You are not judging that track.");

        const track = await getTrack(team.trackId);
        if (!track) return fail("That track no longer exists.");
        if (!track.rubric.length) return fail("The organiser has not published a rubric for this track yet.");

        // Scored against the round the TRACK is on, not one the form supplies:
        // otherwise a judge could overwrite a closed round's card.
        const round = track.currentRound;
        if (team.eliminatedAtRound !== null && team.eliminatedAtRound < round) {
            return fail("That team is no longer in this round.");
        }
        if (team.round < round) return fail("That team did not advance to this round.");

        const raw: Record<string, unknown> = {};
        for (const category of track.rubric) raw[category.id] = formData.get(`score-${category.id}`);
        const { byCategory, total } = scoreCard(track.rubric, raw);

        const now = new Date();
        await adminDb
            .collection(COLLECTIONS.HACKATHON_TEAMS)
            .doc(team.id)
            .set(
                {
                    scores: {
                        [judge.id]: {
                            [roundKey(round)]: {
                                byCategory,
                                // Recomputed from the rubric, never taken from the
                                // form: the total is what decides the winner.
                                total,
                                comment: String(formData.get("comment") ?? "").trim().slice(0, 2000),
                                scoredAt: now,
                            },
                        },
                    },
                    updatedAt: now,
                },
                { merge: true },
            );

        await adminDb
            .collection(COLLECTIONS.HACKATHON_JUDGES)
            .doc(judge.id)
            .set({ lastScoredAt: now, updatedAt: now }, { merge: true })
            .catch((err: unknown) => console.error("[submitScore] could not stamp the judge", err));

        const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
        const scoreRows = Object.entries(byCategory).map(([category, score]) => ({
            hackathon_team_id: team.id,
            judge_id: judge.id,
            round,
            category,
            score,
            comment,
            scored_at: now.toISOString(),
        }));
        if (scoreRows.length) {
            await supabaseAdmin.from(TABLES.HACKATHON_SCORES).upsert(scoreRows, {
                onConflict: "hackathon_team_id,judge_id,round,category",
            });
        }

        revalidatePath(`/judge/${token}`);
        revalidatePath(hackathonTrackManagePath(judge.organizerId, judge.eventId, team.trackId));
        revalidatePath(`/events/${judge.eventId}/tracks/${team.trackId}/leaderboard`);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[submitScore]", err);
        return fail("Could not save that score. Please try again.");
    }
}

/* -------------------------------------------------------------- rounds */

/**
 * Close the current round and advance the top teams (spec 3.3's multi-round).
 *
 * Ties at the cut-off are all carried rather than broken by the app -- see
 * `advanceSelection`. Teams that do not advance are marked eliminated at the
 * round they were in, so the leaderboard for an earlier round still shows them
 * where they finished instead of erasing them.
 */
export async function advanceRound(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change that event.");

        const trackId = String(formData.get("trackId") ?? "").trim();
        const track = trackId ? await getTrack(trackId) : null;
        if (!track || track.eventId !== event.id) return fail("That track does not belong to this event.");
        if (!track.rubric.length) return fail("Publish a rubric before closing a round.");

        const topN = Math.max(1, Math.round(Number(formData.get("topN") ?? 0) || 0));
        const teams = await listTeams(track.id);
        const judges = await judgesForTrack(event.id, track.id);
        const ranked = rankTeams(teams, track.rubric, track.currentRound, judges.length);
        const { advancing, eliminated, carriedTies } = advanceSelection(ranked, topN);

        if (!advancing.length) {
            return fail("No team on this track has been scored yet, so there is nobody to advance.");
        }

        const nextRound = track.currentRound + 1;
        const batch = adminDb.batch();
        const now = new Date();
        for (const id of advancing) {
            batch.set(
                adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(id),
                { round: nextRound, updatedAt: now },
                { merge: true },
            );
        }
        for (const id of eliminated) {
            batch.set(
                adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(id),
                { eliminatedAtRound: track.currentRound, updatedAt: now },
                { merge: true },
            );
        }
        batch.set(
            adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).doc(track.id),
            { currentRound: nextRound, updatedAt: now },
            { merge: true },
        );
        await batch.commit();

        const base = hackathonDashPath(event.organizerId, event.id, "competitions");
        revalidatePath(`${base}/${track.id}`);
        revalidatePath(`/events/${event.id}/tracks/${track.id}/leaderboard`);
        return {
            success: true,
            ...(carriedTies
                ? { error: `${advancing.length} teams advanced — ${carriedTies} more than asked for, because they tied on the cut-off.` }
                : {}),
        };
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[advanceRound]", err);
        return fail("Could not close that round. Please try again.");
    }
}

/** For the organizer's judge list: the link to copy if the email went astray. */
export async function judgeLink(judge: HackathonJudge): Promise<string> {
    return judge.inviteToken ? absoluteUrl(`/judge/${judge.inviteToken}`) : Promise.resolve("");
}
