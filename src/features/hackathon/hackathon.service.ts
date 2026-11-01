import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";
import type { HackathonJudge } from "./judging";
import {
  EMPTY_SETTINGS,
  type HackathonAnnouncement,
  type HackathonMentor,
  type HackathonSettings,
  type MentorSlot,
} from "./live";
import { parseHackathonKind } from "./kinds";
import { hydrateDoc } from "./teamWrite";
import {
  normalizeJoinCode,
  type FeeStatus,
  type HackathonTeam,
  type HackathonTrack,
  type RubricCategory,
  type HackathonTeamMember,
  type TeamSubmission,
  type TeamScores,
  type JudgeScore,
} from "./types";

/**
 * Reads for the hackathon module. Server only.
 */

const HACKATHON_TRACK_PRIZE_COLS = "id, track_id, position_label, amount, description, order_index";
const HACKATHON_TRACK_COLS =
  "id, event_id, organizer_id, name, description, rules_file_path, rules_file_name, fee, currency, min_team_size, max_team_size, opens_at, closes_at, registration_closes_at, roster_locks_at, submission_deadline_at, prize_pool, rubric, current_round, image_url, policies, instructions, instructions_file_path, instructions_file_name, discount_percent, discount_note, discount_expires_at, status, ended_at, kind, rules_text, created_at, updated_at, extra";
const HACKATHON_TEAM_COLS =
  "id, event_id, track_id, name, join_code, access_code_hash, member_registration_ids, looking_for_members, fee_status, fee_proof_path, round, eliminated_at_round, scores, rules_acknowledged_at, created_at, updated_at, extra, status";
const HACKATHON_JUDGE_COLS =
  "id, event_id, name, email, track_ids, invite_token, invited_at, last_scored_at, extra";
const HACKATHON_MENTOR_COLS = "id, event_id, name, email, expertise, bio, extra";
const HACKATHON_ANNOUNCEMENT_COLS =
  "id, event_id, track_id, title, body, emailed_count, created_at, extra";
const HACKATHON_SETTINGS_COLS =
  "event_id, extra, livestream_url, max_attachment_mb, online_mode, updated_at";

const FEE_STATUSES: FeeStatus[] = ["not_required", "fee_pending", "fee_paid"];

function mapToRubric(raw: any): RubricCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: any, i: number) => ({
    id: String(c?.id || `c${i}`),
    label: String(c?.label || ""),
    maxScore: Number(c?.maxScore ?? c?.max_score ?? 0) || 0,
  }));
}

function mapFeeStatus(raw: any): FeeStatus {
  // Prefer app-facing value in extra (not_required | fee_pending | fee_paid).
  // Postgres column only allows unpaid | fee_paid — map unpaid → fee_pending so
  // UI never shows "No fee" next to a real track/registration amount.
  const fromExtra =
    raw?.feeStatus ??
    (typeof raw?.extra === "object" && raw?.extra ? (raw.extra as any).feeStatus : undefined);
  if (FEE_STATUSES.includes(fromExtra)) return fromExtra as FeeStatus;
  const col = raw?.fee_status ?? raw?.feeStatus;
  if (col === "fee_paid") return "fee_paid";
  if (col === "unpaid" || col === "fee_pending") return "fee_pending";
  if (FEE_STATUSES.includes(col)) return col as FeeStatus;
  return "not_required";
}

export function mapToTrack(raw: any, fallbackId?: string): HackathonTrack {
  const h = hydrateDoc(raw as Record<string, unknown>);
  return {
    id: String(h?.id || fallbackId || ""),
    eventId: String(h?.eventId || h?.event_id || ""),
    organizerId: String(h?.organizerId || h?.organizer_id || ""),
    name: String(h?.name || ""),
    description: String(h?.description || ""),
    rulesPath: String(h?.rulesPath || h?.rules_file_path || h?.rules_path || ""),
    rulesName: String(h?.rulesName || h?.rules_file_name || h?.rules_name || ""),
    fee: Number(h?.fee ?? 0) || 0,
    currency: String(h?.currency || "PKR"),
    minTeamSize: Number(h?.minTeamSize ?? h?.min_team_size ?? 1) || 1,
    maxTeamSize: Number(h?.maxTeamSize ?? h?.max_team_size ?? 4) || 4,
    opensAt: toIsoString(h?.opensAt || h?.opens_at) || "",
    closesAt: toIsoString(h?.closesAt || h?.closes_at) || "",
    registrationClosesAt: toIsoString(h?.registrationClosesAt || h?.registration_closes_at) || "",
    rosterLocksAt:
      toIsoString(
        h?.rosterLocksAt || h?.roster_locks_at || h?.rosterLockDate || h?.roster_lock_date,
      ) || "",
    submissionDeadlineAt:
      toIsoString(
        h?.submissionDeadlineAt ||
          h?.submission_deadline_at ||
          h?.submissionDeadline ||
          h?.submission_deadline,
      ) || "",
    submissionDeadline:
      toIsoString(
        h?.submissionDeadlineAt ||
          h?.submission_deadline_at ||
          h?.submissionDeadline ||
          h?.submission_deadline,
      ) || "",
    rosterLockDate:
      toIsoString(
        h?.rosterLocksAt || h?.roster_locks_at || h?.rosterLockDate || h?.roster_lock_date,
      ) || "",
    prizePool: String(h?.prizePool || h?.prize_pool || ""),
    rubric: mapToRubric(h?.rubric),
    currentRound: Number(h?.currentRound ?? h?.current_round ?? 1) || 1,
    imageUrl: String(h?.imageUrl || h?.image_url || ""),
    policies: String(h?.policies || ""),
    instructions: String(h?.instructions || ""),
    instructionsFilePath: String(h?.instructionsFilePath || h?.instructions_file_path || ""),
    instructionsFileName: String(h?.instructionsFileName || h?.instructions_file_name || ""),
    discountPercent: Number(h?.discountPercent ?? h?.discount_percent ?? 0) || 0,
    discountNote: String(h?.discountNote || h?.discount_note || ""),
    discountExpiresAt: String(h?.discountExpiresAt || h?.discount_expires_at || ""),
    status: String(h?.status || "").toLowerCase() === "ended" ? "ended" : "open",
    endedAt: toIsoString(h?.endedAt || h?.ended_at) || "",
    kind: parseHackathonKind(h?.kind),
    rulesText: String(h?.rulesText || h?.rules_text || ""),
    createdAt: toIsoString(h?.createdAt || h?.created_at) || "",
    updatedAt: toIsoString(h?.updatedAt || h?.updated_at) || "",
  };
}

function mapToMembers(raw: any): HackathonTeamMember[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: any) => m && (m.registrationId || m.registration_id))
    .map((m: any) => ({
      registrationId: String(m.registrationId || m.registration_id),
      name: String(m.name || ""),
      email: String(m.email || ""),
      skills: Array.isArray(m.skills) ? m.skills.map(String) : [],
      isOwner: !!(m.isOwner ?? m.is_owner),
      joinedAt: toIsoString(m.joinedAt || m.joined_at) || "",
    }));
}

function mapToSubmission(raw: any): TeamSubmission {
  return {
    repoUrl: String(raw?.repoUrl || raw?.repo_url || ""),
    demoVideoUrl: String(raw?.demoVideoUrl || raw?.demo_video_url || ""),
    description: String(raw?.description || ""),
    deckPath: String(raw?.deckPath || raw?.deck_path || ""),
    deckName: String(raw?.deckName || raw?.deck_name || ""),
    submittedAt: toIsoString(raw?.submittedAt || raw?.submitted_at),
  };
}

function mapToScores(raw: any): TeamScores {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: TeamScores = {};
  for (const [judgeId, byRound] of Object.entries(raw)) {
    if (!byRound || typeof byRound !== "object") continue;
    const rounds: Record<string, JudgeScore> = {};
    for (const [round, card] of Object.entries(byRound as Record<string, any>)) {
      if (!card || typeof card !== "object") continue;
      rounds[round] = {
        byCategory:
          card.byCategory && typeof card.byCategory === "object" && !Array.isArray(card.byCategory)
            ? Object.fromEntries(
                Object.entries(card.byCategory).map(([k, v]) => [k, Number(v) || 0]),
              )
            : {},
        total: Number(card.total ?? 0) || 0,
        comment: String(card.comment || ""),
        scoredAt: toIsoString(card.scoredAt || card.scored_at) || "",
      };
    }
    if (Object.keys(rounds).length) out[judgeId] = rounds;
  }
  return out;
}

export function mapToTeam(raw: any, fallbackId?: string): HackathonTeam {
  const h = hydrateDoc(raw as Record<string, unknown>);
  let members = mapToMembers(h?.members);
  const memberIds = Array.isArray(h?.memberRegistrationIds)
    ? h.memberRegistrationIds.map(String)
    : Array.isArray(h?.member_registration_ids)
      ? (h.member_registration_ids as unknown[]).map(String)
      : members.map((m) => m.registrationId);
  // Seed / Postgres rows often keep roster only in member_registration_ids (or the
  // join table), not in extra.members — synthesize stubs so counts and ACL work.
  if (!members.length && memberIds.length) {
    members = memberIds.map((registrationId, i) => ({
      registrationId,
      name: "",
      email: "",
      skills: [],
      isOwner: i === 0,
      joinedAt: "",
    }));
  }
  return {
    id: String(h?.id || fallbackId || ""),
    eventId: String(h?.eventId || h?.event_id || ""),
    trackId: String(h?.trackId || h?.track_id || ""),
    organizerId: String(h?.organizerId || h?.organizer_id || ""),
    name: String(h?.name || ""),
    joinCode: String(h?.joinCode || h?.join_code || ""),
    accessCode: String(h?.accessCode || h?.access_code || "") || null,
    members,
    memberRegistrationIds: memberIds.length ? memberIds : members.map((m) => m.registrationId),
    maxTeamSize: Number(h?.maxTeamSize ?? h?.max_team_size ?? 4) || 4,
    lookingForMembers: !!(h?.lookingForMembers ?? h?.looking_for_members),
    unlockedByOrganizer: !!(h?.unlockedByOrganizer ?? h?.unlocked_by_organizer),
    submission: mapToSubmission(h?.submission),
    feeStatus: mapFeeStatus(h),
    feeProofPath: String(h?.feeProofPath || h?.fee_proof_path || ""),
    round: Number(h?.round ?? 1) || 1,
    eliminatedAtRound:
      h?.eliminatedAtRound === null ||
      h?.eliminatedAtRound === undefined ||
      h?.eliminated_at_round === null ||
      h?.eliminated_at_round === undefined
        ? null
        : Number(h.eliminatedAtRound ?? h.eliminated_at_round) || null,
    scores: mapToScores(h?.scores),
    rulesAcknowledgedAt: toIsoString(h?.rulesAcknowledgedAt || h?.rules_acknowledged_at) || "",
    createdAt: toIsoString(h?.createdAt || h?.created_at) || "",
    updatedAt: toIsoString(h?.updatedAt || h?.updated_at) || "",
  };
}

export type TrackPrize = {
  id: string;
  trackId: string;
  positionLabel: string;
  amount: string;
  description: string;
  orderIndex: number;
};

export async function listPrizesForTracks(trackIds: string[]): Promise<Map<string, TrackPrize[]>> {
  const out = new Map<string, TrackPrize[]>();
  if (!trackIds.length) return out;
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACK_PRIZES)
    .select(HACKATHON_TRACK_PRIZE_COLS)
    .in("track_id", trackIds)
    .order("order_index");
  for (const row of data ?? []) {
    const prize: TrackPrize = {
      id: String(row.id),
      trackId: String(row.track_id),
      positionLabel: String(row.position_label || ""),
      amount: String(row.amount || ""),
      description: String(row.description || ""),
      orderIndex: Number(row.order_index) || 0,
    };
    const list = out.get(prize.trackId) ?? [];
    list.push(prize);
    out.set(prize.trackId, list);
  }
  return out;
}

export async function listPrizesForTrack(trackId: string): Promise<TrackPrize[]> {
  if (!trackId) return [];
  const map = await listPrizesForTracks([trackId]);
  return map.get(trackId) ?? [];
}

/** Tracks of one event, in the order an organizer created them. */
export const listTracks = cache(async (eventId: string): Promise<HackathonTrack[]> => {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACKS)
    .select(HACKATHON_TRACK_COLS)
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? [])
    .map((d) => mapToTrack(d, d.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
});

export const getTrack = cache(async (trackId: string): Promise<HackathonTrack | null> => {
  if (!trackId) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACKS)
    .select(HACKATHON_TRACK_COLS)
    .eq("id", trackId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToTrack(data, data.id) : null;
});

/** Every team on one event, so a page can group by track without N queries. */
export const listTeamsOfEvent = cache(async (eventId: string): Promise<HackathonTeam[]> => {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select(HACKATHON_TEAM_COLS)
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []).map((d) => mapToTeam(d, d.id)).sort((a, b) => a.name.localeCompare(b.name));
});

export const listTeams = cache(async (trackId: string): Promise<HackathonTeam[]> => {
  if (!trackId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select(HACKATHON_TEAM_COLS)
    .eq("track_id", trackId);
  if (error) throw error;
  return (data ?? []).map((d) => mapToTeam(d, d.id)).sort((a, b) => a.name.localeCompare(b.name));
});

/**
 * Every team this participant belongs to, across all tracks of every event.
 */
export const teamsForRegistration = cache(
  async (registrationId: string): Promise<HackathonTeam[]> => {
    if (!registrationId) return [];
    const { data, error } = await (supabaseAdmin.from(TABLES.HACKATHON_TEAMS) as any)
      .select(HACKATHON_TEAM_COLS)
      .contains("member_registration_ids", [registrationId]);
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((d) => mapToTeam(d, String(d.id)));
  },
);

/** The team this participant is in for one specific track, if any. */
export async function teamForRegistrationInTrack(
  registrationId: string,
  trackId: string,
): Promise<HackathonTeam | null> {
  const teams = await teamsForRegistration(registrationId);
  return teams.find((t) => t.trackId === trackId) ?? null;
}

export const findTeamByJoinCode = cache(async (rawCode: string): Promise<HackathonTeam | null> => {
  const code = normalizeJoinCode(rawCode);
  if (!code) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select(HACKATHON_TEAM_COLS)
    .eq("join_code", code);
  if (error) throw error;
  if (!data?.length) return null;
  if (data.length > 1) {
    console.error("[findTeamByJoinCode] duplicate join code, refusing to guess", {
      code,
      count: data.length,
    });
    return null;
  }
  return mapToTeam(data[0], data[0].id);
});

/** Whether any team already holds this code. Checked before minting a new one. */
export async function joinCodeTaken(code: string): Promise<boolean> {
  const normalized = normalizeJoinCode(code);
  if (!normalized) return true;
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select("id")
    .eq("join_code", normalized)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

function hackathonNeedle(value: unknown): boolean {
  const s = String(value || "").toLowerCase();
  return s === "hackathon" || s.includes("hackathon");
}

/** True when this event runs on the hackathon format (spec 3.1). */
export function isHackathon(
  event:
    | {
        id?: string;
        title?: string;
        name?: string;
        eventFormatId?: string;
        eventType?: string;
        categoryFormatId?: string;
      }
    | null
    | undefined,
): boolean {
  if (!event) return false;
  return (
    hackathonNeedle(event.eventFormatId) ||
    hackathonNeedle(event.categoryFormatId) ||
    hackathonNeedle(event.eventType) ||
    hackathonNeedle(event.title) ||
    hackathonNeedle(event.name)
  );
}

export const listHackathonEventIdsForOrganizer = cache(
  async (organizerId: string): Promise<Set<string>> => {
    if (!organizerId) return new Set();
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .select("event_id")
      .eq("organizer_id", organizerId);
    if (error) throw error;
    return new Set((data ?? []).map((d) => String(d.event_id || "")));
  },
);

export async function eventIsHackathon(
  event:
    | {
        id?: string;
        title?: string;
        name?: string;
        eventFormatId?: string;
        eventType?: string;
        categoryFormatId?: string;
      }
    | null
    | undefined,
): Promise<boolean> {
  if (!event) return false;
  if (isHackathon(event)) return true;
  if (!event.id) return false;
  const tracks = await listTracks(event.id);
  if (tracks.length > 0) return true;
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACKS)
    .select("id")
    .eq("event_id", event.id)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/* ------------------------------------------------------- judges (spec 3.3) */

export function mapToJudge(raw: any, fallbackId?: string): HackathonJudge {
  const h = hydrateDoc(raw as Record<string, unknown>);
  return {
    id: String(h?.id || fallbackId || ""),
    eventId: String(h?.eventId || h?.event_id || ""),
    organizerId: String(h?.organizerId || h?.organizer_id || ""),
    name: String(h?.name || ""),
    email: String(h?.email || ""),
    trackIds: Array.isArray(h?.trackIds)
      ? h.trackIds.map(String)
      : Array.isArray(h?.track_ids)
        ? (h.track_ids as unknown[]).map(String)
        : [],
    inviteToken:
      h?.inviteToken || h?.invite_token ? String(h?.inviteToken || h?.invite_token) : null,
    invitedAt: toIsoString(h?.invitedAt || h?.invited_at) || "",
    lastScoredAt: toIsoString(h?.lastScoredAt || h?.last_scored_at),
    createdAt: toIsoString(h?.createdAt || h?.created_at) || "",
    updatedAt: toIsoString(h?.updatedAt || h?.updated_at) || "",
  };
}

export const listJudges = cache(async (eventId: string): Promise<HackathonJudge[]> => {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_JUDGES)
    .select(HACKATHON_JUDGE_COLS)
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []).map((d) => mapToJudge(d, d.id)).sort((a, b) => a.name.localeCompare(b.name));
});

/** Judges assigned to one track. Filtered in memory: `trackIds` is an array. */
export async function judgesForTrack(eventId: string, trackId: string): Promise<HackathonJudge[]> {
  const judges = await listJudges(eventId);
  return judges.filter((j) => j.trackIds.includes(trackId));
}

export const findJudgeByToken = cache(async (token: string): Promise<HackathonJudge | null> => {
  const value = String(token ?? "").trim();
  if (!value) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_JUDGES)
    .select(HACKATHON_JUDGE_COLS)
    .eq("invite_token", value)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToJudge(data, data.id) : null;
});

/* ------------------------------------------------------ mentors (spec 3.4) */

function mapToSlots(raw: any): MentorSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s: any) => s && (s.date || s.slot_date))
    .map((s: any) => ({
      id: String(s.id || ""),
      date: String(s.date || s.slot_date || ""),
      startTime: String(s.startTime || s.start_time || ""),
      endTime: String(s.endTime || s.end_time || ""),
      bookedByTeamId: String(s.bookedByTeamId || s.booked_by_team_id || ""),
      bookedTeamName: String(s.bookedTeamName || s.booked_team_name || ""),
      bookedAt: toIsoString(s.bookedAt || s.booked_at),
    }));
}

export function mapToMentor(raw: any, fallbackId?: string): HackathonMentor {
  const h = hydrateDoc(raw as Record<string, unknown>);
  return {
    id: String(h?.id || fallbackId || ""),
    eventId: String(h?.eventId || h?.event_id || ""),
    name: String(h?.name || ""),
    email: String(h?.email || ""),
    expertise: Array.isArray(h?.expertise) ? h.expertise.map(String) : [],
    bio: String(h?.bio || ""),
    slots: mapToSlots(h?.slots),
    createdAt: toIsoString(h?.createdAt || h?.created_at) || "",
    updatedAt: toIsoString(h?.updatedAt || h?.updated_at) || "",
  };
}

export const listMentors = cache(async (eventId: string): Promise<HackathonMentor[]> => {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_MENTORS)
    .select(HACKATHON_MENTOR_COLS)
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []).map((d) => mapToMentor(d, d.id)).sort((a, b) => a.name.localeCompare(b.name));
});

/* ------------------------------------------------ announcements (spec 3.4) */

export function mapToAnnouncement(raw: any, fallbackId?: string): HackathonAnnouncement {
  const h = hydrateDoc(raw as Record<string, unknown>);
  return {
    id: String(h?.id || fallbackId || ""),
    eventId: String(h?.eventId || h?.event_id || ""),
    trackId: String(h?.trackId || h?.track_id || ""),
    title: String(h?.title || ""),
    body: String(h?.body || ""),
    emailedCount: Number(h?.emailedCount ?? h?.emailed_count ?? 0) || 0,
    createdAt: toIsoString(h?.createdAt || h?.created_at) || "",
  };
}

export const listAnnouncements = cache(
  async (eventId: string): Promise<HackathonAnnouncement[]> => {
    if (!eventId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_ANNOUNCEMENTS)
      .select(HACKATHON_ANNOUNCEMENT_COLS)
      .eq("event_id", eventId);
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToAnnouncement(d, d.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
);

/* -------------------------------------------------- online mode (spec 3.5) */

export const getHackathonSettings = cache(async (eventId: string): Promise<HackathonSettings> => {
  if (!eventId) return { eventId: "", ...EMPTY_SETTINGS };
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_SETTINGS)
      .select(HACKATHON_SETTINGS_COLS)
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) throw error;
    const raw = data as Record<string, unknown> | null;
    const extra = pickExtraSafe(raw);
    return {
      eventId,
      onlineMode: !!(raw?.online_mode ?? extra.onlineMode),
      livestreamUrl: String(raw?.livestream_url || extra.livestreamUrl || ""),
      maxAttachmentMb: Math.min(
        50,
        Math.max(1, Number((raw as any)?.max_attachment_mb ?? extra.maxAttachmentMb ?? 10) || 10),
      ),
      updatedAt: toIsoString(raw?.updated_at || extra.updatedAt) || "",
    };
  } catch (err) {
    console.error("[getHackathonSettings]", err);
    return { eventId, ...EMPTY_SETTINGS };
  }
});

function pickExtraSafe(row: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const e = row?.extra;
  return e && typeof e === "object" && !Array.isArray(e) ? (e as Record<string, unknown>) : {};
}
