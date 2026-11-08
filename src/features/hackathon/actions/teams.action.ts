"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { CERTIFICATES_BUCKET, supabaseAdmin } from "@/data/supabase";
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
import { trackConfig } from "../tasks.service";
import { organizerHackathonCachePaths } from "../kinds";
import { insertHackathonTeamRow, patchHackathonTeam, patchRegistration } from "../teamWrite";
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
 */

const DECK_FOLDER = "track-submissions";
const FEE_FOLDER = "track-fees";
const MAX_DECK_BYTES = 25 * 1024 * 1024;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

class Refused extends Error {}

function refuse(message: string): never {
  throw new Refused(message);
}

function safeUrl(raw: unknown, label: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) refuse(`The ${label} needs to start with http:// or https://`);
  if (value.length > 500) refuse(`That ${label} is too long.`);
  return value;
}

function pickSkills(formData: FormData): string[] {
  return formData.getAll("skills").map(String).filter(isSkillTag).slice(0, 10);
}

function memberOf(team: HackathonTeam, registrationId: string): HackathonTeamMember | undefined {
  return team.members.find((m) => m.registrationId === registrationId);
}

function participantPaths(eventId: string, registrationId: string): string[] {
  return [
    `/events/${eventId}/ticket/${registrationId}`,
    `/events/${eventId}/ticket/${registrationId}/team`,
  ];
}

function revalidateAll(
  eventId: string,
  registrationId: string,
  organizerId: string,
  trackId: string,
) {
  for (const path of participantPaths(eventId, registrationId)) revalidatePath(path);
  for (const path of organizerHackathonCachePaths(organizerId, eventId, trackId))
    revalidatePath(path);
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
    if (track.status === "ended") return fail(JOIN_REFUSAL_MESSAGE.competition_ended);

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Give your team a name.");
    if (name.length > 80) return fail("That team name is too long.");

    if (rosterLocked(track, { unlockedByOrganizer: false })) {
      return fail("Team registration for this track has closed.");
    }

    const mine = await teamsForRegistration(registrationId);
    if (mine.some((t) => t.trackId === track.id)) {
      return fail(JOIN_REFUSAL_MESSAGE.already_in_another_team);
    }

    let joinCode = "";
    for (let attempt = 0; attempt < 6 && !joinCode; attempt += 1) {
      const candidate = makeJoinCode();
      if (!(await joinCodeTaken(candidate))) joinCode = candidate;
    }
    if (!joinCode) return fail("Could not allocate a join code. Please try again.");

    const now = new Date();
    const member: HackathonTeamMember = {
      registrationId,
      name: who.registration.attendee?.name || "Participant",
      email: who.registration.attendee?.email || "",
      skills: pickSkills(formData),
      isOwner: true,
      joinedAt: now.toISOString(),
    };

    await insertHackathonTeamRow({
      eventId: who.event.id,
      trackId: track.id,
      organizerId: who.event.organizerId,
      name,
      joinCode,
      members: [member],
      maxTeamSize: track.maxTeamSize,
      lookingForMembers: track.maxTeamSize > 1,
      feeStatus: track.fee > 0 ? "fee_pending" : "not_required",
    });

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(who.event.id, ["hackathon_teams"]);

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

    const { listPhasesForEvent } = await import("../tasks.service");
    const { joinCodeValidUntilIso } = await import("../joinCodeValidity");
    const { parseScheduleDateTime } = await import("@/src/lib/datetime");
    const parsedEnd = parseScheduleDateTime(
      who.event.schedule?.endDate ?? who.event.schedule?.startDate,
      who.event.schedule?.endTime,
    )?.toISOString();
    const eventEndsAtIso =
      parsedEnd || who.event.schedule?.endDate || who.event.schedule?.startDate || null;
    const phases = await listPhasesForEvent(who.event.id, found ? [found.trackId] : []).catch(
      () => [],
    );
    const joinCodeValidUntil = joinCodeValidUntilIso({
      eventEndsAtIso: eventEndsAtIso ? String(eventEndsAtIso) : null,
      phaseCloses: phases.map((p) => p.closes_at || p.ends_at || null),
    });
    const decision = canJoin({
      eventId: who.event.id,
      registrationId,
      team: found,
      track,
      currentTeamTrackId: mine.find((t) => t.trackId === found?.trackId)?.trackId ?? null,
      joinCodeValidUntil,
    });
    if (!decision.allowed) return fail(JOIN_REFUSAL_MESSAGE[decision.reason]);
    if (!found || !track) return fail(JOIN_REFUSAL_MESSAGE.no_such_code);

    const now = new Date();
    const member: HackathonTeamMember = {
      registrationId,
      name: who.registration.attendee?.name || "Participant",
      email: who.registration.attendee?.email || "",
      skills: pickSkills(formData),
      isOwner: false,
      joinedAt: now.toISOString(),
    };

    const { data: teamRow, error: readErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", found.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!teamRow) refuse(JOIN_REFUSAL_MESSAGE.no_such_code);
    const fresh = mapToTeam(teamRow, teamRow.id);

    const already = await teamsForRegistration(registrationId);
    const alreadyInTrack = already.find((t) => t.trackId === fresh.trackId);

    const again = canJoin({
      eventId: who.event.id,
      registrationId,
      team: fresh,
      track,
      currentTeamTrackId: alreadyInTrack?.trackId ?? null,
      joinCodeValidUntil,
    });
    if (!again.allowed) refuse(JOIN_REFUSAL_MESSAGE[again.reason]);

    const members = [...fresh.members, member];
    await patchHackathonTeam(found.id, {
      members,
      memberRegistrationIds: members.map((m) => m.registrationId),
      lookingForMembers: members.length < fresh.maxTeamSize && fresh.lookingForMembers,
      updatedAt: now,
    });

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(who.event.id, ["hackathon_teams"]);

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
    const now = new Date();
    let trackId = "";

    const { data: teamRow, error: readErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!teamRow) refuse("That team no longer exists.");
    const team = mapToTeam(teamRow, teamRow.id);
    if (team.eventId !== who.event.id) refuse("That team is not on this event.");
    if (!memberOf(team, registrationId)) refuse("You are not in that team.");
    trackId = team.trackId;

    const track = await getTrack(team.trackId);
    if (track && rosterLocked(track, team)) refuse(JOIN_REFUSAL_MESSAGE.roster_locked);

    const members = team.members.filter((m) => m.registrationId !== registrationId);
    if (members.length === 0) {
      const { error } = await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).delete().eq("id", teamId);
      if (error) throw error;
    } else {
      if (!members.some((m) => m.isOwner)) members[0] = { ...members[0], isOwner: true };
      await patchHackathonTeam(teamId, {
        members,
        memberRegistrationIds: members.map((m) => m.registrationId),
        updatedAt: now,
      });
    }

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(who.event.id, ["hackathon_teams"]);

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
    const { data: teamRow, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    if (!teamRow) return fail("That team no longer exists.");
    const team = mapToTeam(teamRow, teamRow.id);
    if (team.eventId !== who.event.id) return fail("That team is not on this event.");
    if (!memberOf(team, registrationId)) return fail("You are not in that team.");

    const skills = pickSkills(formData);
    const members = team.members.map((m) =>
      m.registrationId === registrationId ? { ...m, skills } : m,
    );
    const lookingForMembers = formData.has("lookingForMembers")
      ? String(formData.get("lookingForMembers")) === "true"
      : team.lookingForMembers;

    await patchHackathonTeam(team.id, { members, lookingForMembers, updatedAt: new Date() });

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(who.event.id, ["hackathon_teams"]);

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
    const { data: teamRow, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    if (!teamRow) return fail("That team no longer exists.");
    const team = mapToTeam(teamRow, teamRow.id);
    if (team.eventId !== who.event.id) return fail("That team is not on this event.");
    if (!memberOf(team, registrationId)) return fail("You are not in that team.");

    const track = await getTrack(team.trackId);
    if (!track) return fail("That track no longer exists.");
    if (deadlinePassed(track)) return fail("The submission deadline for this track has passed.");
    if (feeBlocksSubmission(track, team)) {
      return fail("The organiser has not confirmed this track's entry fee for your team yet.");
    }

    const repoUrl = safeUrl(formData.get("repoUrl"), "repository link");
    const demoVideoUrl = safeUrl(formData.get("demoVideoUrl"), "demo video link");
    const description = String(formData.get("description") ?? "")
      .trim()
      .slice(0, 4000);

    let deckPath = team.submission.deckPath;
    let deckName = team.submission.deckName;
    const deck = formData.get("deck");
    if (deck instanceof File && deck.size > 0) {
      if (deck.size > MAX_DECK_BYTES)
        return fail("That deck is too large. Please keep it under 25MB.");
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

    const cfg = await trackConfig(track.id);
    if (cfg.on("link_submissions")) {
      if (!repoUrl) return fail("This track requires a repository link.");
      if (cfg.value("link_submissions").requireDemo === true && !demoVideoUrl) {
        return fail("This track requires a demo video link.");
      }
    }

    await patchHackathonTeam(team.id, {
      submission: {
        repoUrl,
        demoVideoUrl,
        description,
        deckPath,
        deckName,
        submittedAt: team.submission.submittedAt ?? new Date().toISOString(),
      },
      updatedAt: new Date(),
    });

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
    const { data: teamRow, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    if (!teamRow) return fail("That team no longer exists.");
    const team = mapToTeam(teamRow, teamRow.id);
    if (team.eventId !== who.event.id) return fail("That team is not on this event.");
    if (!memberOf(team, registrationId)) return fail("You are not in that team.");

    const proof = formData.get("proof");
    if (!(proof instanceof File) || proof.size === 0)
      return fail("Choose a screenshot of your transfer.");
    if (!proof.type.startsWith("image/")) return fail("The proof needs to be an image.");
    if (proof.size > MAX_PROOF_BYTES)
      return fail("That image is too large. Please upload one under 5MB.");

    const upload = new FormData();
    upload.append("file", proof);
    upload.append("folder", FEE_FOLDER);
    upload.append("bucket", CERTIFICATES_BUCKET);
    const uploaded = await uploadMedia(upload);
    if (!uploaded.success) {
      console.error("[uploadFeeProof] upload failed", uploaded.error);
      return fail(uploaded.error || "That image could not be uploaded.");
    }

    await patchHackathonTeam(team.id, {
      feeProofPath: uploaded.path,
      feeStatus: team.feeStatus === "fee_paid" ? "fee_paid" : "fee_pending",
      updatedAt: new Date(),
    });

    revalidateAll(who.event.id, registrationId, who.event.organizerId, team.trackId);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[uploadFeeProof]", err);
    return fail("Could not upload that. Please try again.");
  }
}
