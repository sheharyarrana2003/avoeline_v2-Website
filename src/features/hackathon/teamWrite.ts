import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { FeeStatus, HackathonTeamMember, TeamSubmission } from "./types";

/** Postgres fee_status check allows only unpaid | fee_paid. */
export function feeStatusToDb(status: FeeStatus | string): "unpaid" | "fee_paid" {
  return status === "fee_paid" ? "fee_paid" : "unpaid";
}

export function pickExtra(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const e = row?.extra;
  return e && typeof e === "object" && !Array.isArray(e)
    ? { ...(e as Record<string, unknown>) }
    : {};
}

/** Merge jsonb `extra` with top-level columns for camelCase mappers. */
export function hydrateDoc(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!row) return {};
  const extra = pickExtra(row);
  return { ...extra, ...row, id: row.id ?? extra.id };
}

type TeamCol =
  | "name"
  | "join_code"
  | "looking_for_members"
  | "needed_skills"
  | "fee_status"
  | "fee_proof_path"
  | "eliminated_at_round"
  | "scores"
  | "round"
  | "member_registration_ids"
  | "access_code_hash"
  | "status"
  | "rules_acknowledged_at"
  | "updated_at"
  | "extra";

const EXTRA_KEYS = new Set([
  "members",
  "submission",
  "unlockedByOrganizer",
  "unlocked_by_organizer",
  "maxTeamSize",
  "max_team_size",
  "organizerId",
  "organizer_id",
  "accessCode",
  "access_code",
  "feeStatus",
  "hintsRevealed",
  "taskStartedAt",
  "completedPhaseNumbers",
  "currentPhaseNumber",
  "phaseSubmissions",
  "dailySubmissions",
]);

function iso(v: unknown): unknown {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * Partial update of a hackathon team: known columns go to the row, everything
 * else merges into `extra` (preserving prior extra keys).
 */
export async function patchHackathonTeam(
  teamId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select("*")
    .eq("id", teamId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!existing) throw new Error("Team not found");

  const extra = pickExtra(existing as Record<string, unknown>);
  const row: Partial<Record<TeamCol, unknown>> = {
    updated_at: new Date().toISOString(),
  };

  for (const [key, raw] of Object.entries(patch)) {
    if (key === "id" || key === "extra") continue;
    const value = iso(raw);

    if (key === "feeStatus" || key === "fee_status") {
      row.fee_status = feeStatusToDb(String(value));
      extra.feeStatus = value;
      continue;
    }
    if (key === "updatedAt" || key === "updated_at") {
      row.updated_at = value;
      continue;
    }
    if (key === "name") row.name = value;
    else if (key === "joinCode" || key === "join_code") row.join_code = value;
    else if (key === "lookingForMembers" || key === "looking_for_members")
      row.looking_for_members = value;
    else if (key === "neededSkills" || key === "needed_skills") row.needed_skills = value;
    else if (key === "feeProofPath" || key === "fee_proof_path") row.fee_proof_path = value;
    else if (key === "eliminatedAtRound" || key === "eliminated_at_round")
      row.eliminated_at_round = value;
    else if (key === "scores") row.scores = value;
    else if (key === "round") row.round = value;
    else if (key === "memberRegistrationIds" || key === "member_registration_ids") {
      (row as Record<string, unknown>).member_registration_ids = value;
    } else if (key === "accessCodeHash" || key === "access_code_hash") row.access_code_hash = value;
    else if (key === "status") row.status = value;
    else if (key === "rulesAcknowledgedAt" || key === "rules_acknowledged_at") {
      row.rules_acknowledged_at = value;
      continue;
    } else if (EXTRA_KEYS.has(key) || !key.includes("_") || key === key) {
      extra[key] = value;
      if (key === "unlockedByOrganizer") extra.unlocked_by_organizer = value;
      if (key === "maxTeamSize") extra.max_team_size = value;
      if (key === "organizerId") extra.organizer_id = value;
      if (key === "accessCode") extra.access_code = value;
    } else {
      extra[key] = value;
    }
  }

  row.extra = extra;

  const { error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .update(row as never)
    .eq("id", teamId);
  if (error) throw error;
}

export type InsertTeamArgs = {
  eventId: string;
  trackId: string;
  organizerId: string;
  name: string;
  joinCode: string;
  members: HackathonTeamMember[];
  maxTeamSize: number;
  lookingForMembers: boolean;
  feeStatus: FeeStatus;
  feeProofPath?: string;
  submission?: TeamSubmission;
  unlockedByOrganizer?: boolean;
  round?: number;
  scores?: Record<string, unknown>;
};

/** Server-only helper (not a Server Action). Callers must already be authorized. */
export async function createHackathonTeamWithMembers(args: {
  eventId: string;
  organizerId: string;
  trackId: string;
  name: string;
  members: { registrationId: string; name: string; email: string; isOwner: boolean }[];
  maxTeamSize: number;
  fee: number;
  feeProofPath?: string | null;
  allocateJoinCode: () => Promise<string | null>;
}): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  const joinCode = await args.allocateJoinCode();
  if (!joinCode) return { ok: false, error: "Could not allocate a join code." };

  const now = new Date();
  const teamId = await insertHackathonTeamRow({
    eventId: args.eventId,
    trackId: args.trackId,
    organizerId: args.organizerId,
    name: args.name,
    joinCode,
    members: args.members.map((m) => ({
      registrationId: m.registrationId,
      name: m.name,
      email: m.email,
      skills: [],
      isOwner: m.isOwner,
      joinedAt: now.toISOString(),
    })),
    maxTeamSize: args.maxTeamSize,
    lookingForMembers: args.maxTeamSize > args.members.length,
    feeStatus: args.fee > 0 ? "fee_pending" : "not_required",
    feeProofPath: args.feeProofPath ?? "",
  });

  await Promise.all(
    args.members.map((member) =>
      patchRegistration(member.registrationId, {
        extra: {
          hackathonTeamId: teamId,
          hackathon_team_id: teamId,
          hackathonRole: member.isOwner ? "team_lead" : "participant",
        },
      }),
    ),
  );
  return { ok: true, teamId };
}

export async function insertHackathonTeamRow(args: InsertTeamArgs): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const memberRegistrationIds = args.members.map((m) => m.registrationId);
  const submission = args.submission ?? {
    repoUrl: "",
    demoVideoUrl: "",
    description: "",
    deckPath: "",
    deckName: "",
    submittedAt: null,
  };
  const extra = {
    members: args.members,
    submission,
    unlockedByOrganizer: args.unlockedByOrganizer ?? false,
    unlocked_by_organizer: args.unlockedByOrganizer ?? false,
    maxTeamSize: args.maxTeamSize,
    max_team_size: args.maxTeamSize,
    organizerId: args.organizerId,
    organizer_id: args.organizerId,
    feeStatus: args.feeStatus,
    memberRegistrationIds,
    accessCode: null as string | null,
  };

  const { error } = await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).insert({
    id,
    event_id: args.eventId,
    track_id: args.trackId,
    name: args.name,
    join_code: args.joinCode,
    looking_for_members: args.lookingForMembers,
    fee_status: feeStatusToDb(args.feeStatus),
    fee_proof_path: args.feeProofPath ?? "",
    round: args.round ?? 1,
    eliminated_at_round: null,
    scores: args.scores ?? {},
    member_registration_ids: memberRegistrationIds,
    access_code_hash: null,
    extra,
    created_at: now,
    updated_at: now,
  } as never);
  if (error) throw error;
  return id;
}

/** Merge fields into registrations.extra (and optional top-level columns). */
export async function patchRegistration(
  registrationId: string,
  patch: { extra?: Record<string, unknown>; status?: string; statusHistory?: unknown[] },
): Promise<void> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("extra, status, status_history")
    .eq("id", registrationId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!existing) return;

  const extra = {
    ...pickExtra(existing as Record<string, unknown>),
    ...(patch.extra ?? {}),
  };
  const row: Record<string, unknown> = {
    extra,
    updated_at: new Date().toISOString(),
  };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.statusHistory !== undefined) row.status_history = patch.statusHistory;

  const { error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .update(row as never)
    .eq("id", registrationId);
  if (error) throw error;
}
