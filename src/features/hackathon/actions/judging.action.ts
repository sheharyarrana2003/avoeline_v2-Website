"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { sendEmail } from "@/src/lib/email";
import { absoluteUrl } from "@/src/lib/appUrl";
import { assertEventActor } from "@/src/features/events/ownership";
import { OrganizerService } from "@/src/services/organizer.service";
import {
  findJudgeByToken,
  getTrack,
  judgesForTrack,
  listTeams,
  listTracks,
  mapToTeam,
} from "../hackathon.service";
import {
  hackathonDashPath,
  hackathonTrackManagePath,
  organizerHackathonCachePaths,
} from "../kinds";
import {
  advanceSelection,
  parseRubricLines,
  rankTeams,
  roundKey,
  scoreCard,
  type HackathonJudge,
} from "../judging";
import { pickExtra, patchHackathonTeam } from "../teamWrite";

function mintToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function saveRubric(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "scoreboard");
    if (!event) return fail("You cannot change that event.");

    const trackId = String(formData.get("trackId") ?? "").trim();
    const track = trackId ? await getTrack(trackId) : null;
    if (!track || track.eventId !== event.id)
      return fail("That track does not belong to this event.");

    const rubric = parseRubricLines(formData.get("rubric"));
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .update({ rubric, updated_at: now })
      .eq("id", track.id);
    if (error) throw error;

    revalidatePath(hackathonTrackManagePath(event.organizerId, event.id, track.id));
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[saveRubric]", err);
    return fail("Could not save the rubric. Please try again.");
  }
}

export async function inviteJudge(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "scoreboard");
    if (!event) return fail("You cannot change that event.");

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!name) return fail("Give the judge a name.");
    if (!looksLikeEmail(email)) return fail("That email address does not look right.");

    const trackIds = formData.getAll("trackIds").map(String).filter(Boolean);
    if (!trackIds.length) return fail("Choose at least one track for them to judge.");

    const tracks = await listTracks(event.id);
    const valid = trackIds.filter((id) => tracks.some((t) => t.id === id));
    if (!valid.length) return fail("Those tracks do not belong to this event.");

    const { data: existingRows, error: listErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .select("*")
      .eq("event_id", event.id);
    if (listErr) throw listErr;
    const existing = (existingRows ?? []).find(
      (d) => String(d.email ?? "").toLowerCase() === email,
    );

    const now = new Date().toISOString();
    const id = existing?.id || randomUUID();
    const token = existing ? String(existing.invite_token || "") || mintToken() : mintToken();
    const extra = {
      ...pickExtra(existing as Record<string, unknown> | null),
      organizerId: event.organizerId,
      organizer_id: event.organizerId,
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    };

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_JUDGES).upsert({
      id,
      event_id: event.id,
      name,
      email,
      track_ids: valid,
      invite_token: token,
      invited_at: existing?.invited_at ?? now,
      last_scored_at: existing?.last_scored_at ?? null,
      extra,
    });
    if (error) throw error;

    const link = await absoluteUrl(`/judge/${token}`);
    const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
    const named = tracks
      .filter((t) => valid.includes(t.id))
      .map((t) => t.name)
      .join(", ");
    await sendEmail(
      { email, name },
      {
        subject: `You're judging ${event.title}`,
        senderName: organizer?.organization?.name?.trim(),
        html: `<p>Hi ${name},</p><p>You have been asked to judge <strong>${event.title}</strong> (${named}).</p><p><a href="${link}">Open your scoring page</a></p><p>That link is yours alone — it needs no password, so please do not forward it.</p>`,
        text: `Hi ${name},\n\nYou have been asked to judge ${event.title} (${named}).\n\nYour scoring page: ${link}\n\nThat link is yours alone — it needs no password, so please do not forward it.`,
      },
    );

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id))
      revalidatePath(path);
    for (const tid of valid) {
      revalidatePath(hackathonTrackManagePath(event.organizerId, event.id, tid));
    }
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[inviteJudge]", err);
    return fail("Could not invite that judge. Please try again.");
  }
}

export async function removeJudge(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const event = await assertEventActor(eventId, "scoreboard");
    if (!event) redirect("/");
    backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

    const judgeId = String(formData.get("judgeId") ?? "").trim();
    const { data: snap } = judgeId
      ? await supabaseAdmin
          .from(TABLES.HACKATHON_JUDGES)
          .select("event_id")
          .eq("id", judgeId)
          .maybeSingle()
      : { data: null };
    if (!snap || String(snap.event_id) !== event.id) {
      redirect(`${backTo}?e=${encodeURIComponent("That judge is not on this event.")}`);
    }

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_JUDGES).delete().eq("id", judgeId);
    if (error) throw error;
    revalidatePath(backTo);
    redirect(backTo);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeJudge]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that judge.")}`);
  }
}

export async function submitScore(
  token: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const judge = await findJudgeByToken(token);
    if (!judge || !judge.inviteToken) return fail("That judging link is no longer valid.");

    const teamId = String(formData.get("teamId") ?? "").trim();
    const { data: teamRow } = teamId
      ? await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("*").eq("id", teamId).maybeSingle()
      : { data: null };
    if (!teamRow) return fail("That team no longer exists.");

    const team = mapToTeam(teamRow, teamRow.id);
    if (team.eventId !== judge.eventId) return fail("That team is not on your event.");
    if (!judge.trackIds.includes(team.trackId)) return fail("You are not judging that track.");

    const track = await getTrack(team.trackId);
    if (!track) return fail("That track no longer exists.");
    if (!track.rubric.length)
      return fail("The organiser has not published a rubric for this track yet.");

    const round = track.currentRound;
    if (team.eliminatedAtRound !== null && team.eliminatedAtRound < round) {
      return fail("That team is no longer in this round.");
    }
    if (team.round < round) return fail("That team did not advance to this round.");

    const raw: Record<string, unknown> = {};
    for (const category of track.rubric) raw[category.id] = formData.get(`score-${category.id}`);
    const { byCategory, total } = scoreCard(track.rubric, raw);

    const now = new Date();
    const scores = { ...(team.scores || {}) } as Record<string, Record<string, unknown>>;
    if (!scores[judge.id]) scores[judge.id] = {};
    scores[judge.id][roundKey(round)] = {
      byCategory,
      total,
      comment: String(formData.get("comment") ?? "")
        .trim()
        .slice(0, 2000),
      scoredAt: now.toISOString(),
    };

    await patchHackathonTeam(team.id, { scores, updatedAt: now });

    await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .update({ last_scored_at: now.toISOString() })
      .eq("id", judge.id)
      .then(({ error }) => {
        if (error) console.error("[submitScore] could not stamp the judge", error);
      });

    const comment = String(formData.get("comment") ?? "")
      .trim()
      .slice(0, 2000);
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

export async function advanceRound(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "scoreboard");
    if (!event) return fail("You cannot change that event.");

    const trackId = String(formData.get("trackId") ?? "").trim();
    const track = trackId ? await getTrack(trackId) : null;
    if (!track || track.eventId !== event.id)
      return fail("That track does not belong to this event.");
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
    const now = new Date().toISOString();
    for (const id of advancing) {
      await patchHackathonTeam(id, { round: nextRound, updatedAt: now });
    }
    for (const id of eliminated) {
      await patchHackathonTeam(id, { eliminatedAtRound: track.currentRound, updatedAt: now });
    }
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .update({ current_round: nextRound, updated_at: now })
      .eq("id", track.id);
    if (error) throw error;

    const base = hackathonDashPath(event.organizerId, event.id, "competitions");
    revalidatePath(`${base}/${track.id}`);
    revalidatePath(`/events/${event.id}/tracks/${track.id}/leaderboard`);
    return {
      success: true,
      ...(carriedTies
        ? {
            error: `${advancing.length} teams advanced — ${carriedTies} more than asked for, because they tied on the cut-off.`,
          }
        : {}),
    };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[advanceRound]", err);
    return fail("Could not close that round. Please try again.");
  }
}

export async function judgeLink(judge: HackathonJudge): Promise<string> {
  return judge.inviteToken ? absoluteUrl(`/judge/${judge.inviteToken}`) : Promise.resolve("");
}
