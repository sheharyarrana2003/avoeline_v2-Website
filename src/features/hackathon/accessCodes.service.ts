import { randomBytes, createHash } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { regStatusToDb } from "@/data/statusMaps";
import { absoluteUrl } from "@/src/lib/appUrl";
import { EventService } from "@/src/services/event.service";
import {
  hydrateRegistrationRow,
  mapToRegistration,
  RegService,
} from "@/src/services/registeration.service";
import type { Registration, RegistrationStatus } from "@/src/services/models/reg.type";
import { sendAccessCodeEmail } from "@/src/features/registration/registrationEmail";
import { recordCommunication } from "@/src/features/registration/registration.service";
import { mapToTeam } from "./hackathon.service";
import { patchHackathonTeam, patchRegistration } from "./teamWrite";
import type { HackathonTeam } from "./types";

const HACKATHON_TEAM_COLS =
  "id, track_id, event_id, name, join_code, status, looking_for_members, needed_skills, fee_status, fee_proof_path, eliminated_at_round, scores, round, created_at, updated_at, extra, member_registration_ids, access_code_hash, rules_acknowledged_at";

const REGISTRATION_COLS =
  "id, event_id, user_id, attendee_name, attendee_email, attendee_phone, ticket_tier_id, final_price, promo_code_used, custom_responses, invite_id, status, waitlist_position, registration_source, qr_code_data, qr_code_image_url, checked_in, check_in_time, check_in_method, checked_in_by, payment_status, amount_paid, payment_proof_path, certificate_issued, certificate_id, feedback_submitted, rating, review_id, created_at, updated_at, cancelled_at, communications, status_history, organizer_id, tier, pricing_tier, extra, hackathon_access_code_hash, group_id";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const HIDDEN_STATUSES = new Set<RegistrationStatus>([
  "awaiting_payment",
  "pending",
  "rejected",
  "cancelled",
  "waitlisted",
]);

function mintPlaintext(): string {
  const bytes = randomBytes(8);
  let code = "AV-";
  for (let i = 0; i < 8; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export function hashAccessCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function paidEnough(reg: Registration): boolean {
  if (Number(reg.finalPrice ?? 0) <= 0) return true;
  return reg.payment?.paymentStatus === "completed";
}

function admitted(status: RegistrationStatus): boolean {
  return status === "confirmed" || status === "checked_in" || status === "attended";
}

async function loadTeamMates(
  reg: Registration,
): Promise<{ team: HackathonTeam | null; cohort: Registration[] }> {
  const teamId = String(reg.hackathonTeamId || "");
  if (!teamId) return { team: null, cohort: [reg] };
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select(HACKATHON_TEAM_COLS)
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { team: null, cohort: [reg] };
  const team = mapToTeam(data, data.id);
  const ids = team.memberRegistrationIds.filter(Boolean);
  if (!ids.length) return { team, cohort: [reg] };
  const all = await RegService.getRegsOfEvent(reg.eventId);
  const byId = new Map(all.map((r) => [r.registrationId, r]));
  const cohort = ids.map((id) => byId.get(id)).filter((r): r is Registration => Boolean(r));
  return { team, cohort: cohort.length ? cohort : [reg] };
}

async function writeTeamCode(teamId: string, plaintext: string): Promise<void> {
  await patchHackathonTeam(teamId, {
    accessCodeHash: hashAccessCode(plaintext),
    accessCode: plaintext,
    updatedAt: new Date(),
  });
}

/**
 * After payment is confirmed and a registration is admitted, mint one code on the team.
 */
export async function maybeRevealHackathonAccessCodes(registrationId: string): Promise<void> {
  const { data: regRow, error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select(REGISTRATION_COLS)
    .eq("id", registrationId)
    .maybeSingle();
  if (error) throw error;
  if (!regRow) return;
  const seed = mapToRegistration(
    hydrateRegistrationRow(regRow as Record<string, unknown>),
    registrationId,
  );
  if (!seed.hackathonTrackId && !seed.hackathonTeamId) return;

  const { team, cohort } = await loadTeamMates(seed);
  const teamPaid = cohort.some(paidEnough);
  const teamAdmitted = cohort.some((r) => admitted(r.status));
  if (!teamPaid || !teamAdmitted) return;

  const event = await EventService.getEventByID(seed.eventId);
  const enterUrl = event ? await absoluteUrl(`/events/${event.id}/enter`) : "";

  for (const member of cohort) {
    if (
      member.status === "cancelled" ||
      member.status === "rejected" ||
      member.status === "waitlisted"
    )
      continue;
    if (member.status === "awaiting_payment" || member.status === "pending") {
      const history = [
        ...(member.statusHistory ?? []),
        { status: "confirmed", timestamp: new Date().toISOString() },
      ];
      await patchRegistration(member.registrationId, {
        status: regStatusToDb("confirmed"),
        statusHistory: history,
      });
      member.status = "confirmed";
    }
  }

  if (!team) return;
  if (team.accessCode) return;

  let plaintext = mintPlaintext();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data: clash } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("id")
      .eq("access_code_hash", hashAccessCode(plaintext))
      .maybeSingle();
    if (!clash) break;
    plaintext = mintPlaintext();
  }
  await writeTeamCode(team.id, plaintext);

  if (event && enterUrl) {
    const ownerId = team.members.find((m) => m.isOwner)?.registrationId;
    const lead =
      (ownerId ? cohort.find((m) => m.registrationId === ownerId) : null) ??
      cohort.find((r) => admitted(r.status)) ??
      cohort[0];
    if (lead && admitted(lead.status)) {
      const sent = await sendAccessCodeEmail(lead, event, plaintext, enterUrl);
      if (sent) await recordCommunication(lead.registrationId, sent);
    }
  }
}

async function memberRegistrationIdsForTeam(team: HackathonTeam): Promise<string[]> {
  const fromDoc = team.memberRegistrationIds.filter(Boolean);
  if (fromDoc.length) return fromDoc;
  // Seed / legacy rows may only have hackathon_team_members without the array.
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAM_MEMBERS)
    .select("registration_id, is_owner")
    .eq("hackathon_team_id", team.id);
  const rows = data ?? [];
  const ownersFirst = [...rows.filter((r) => r.is_owner), ...rows.filter((r) => !r.is_owner)];
  return ownersFirst.map((r) => String(r.registration_id || "")).filter(Boolean);
}

async function leadForTeamDoc(eventId: string, team: HackathonTeam): Promise<Registration | null> {
  const all = await RegService.getRegsOfEvent(eventId);
  const byId = new Map(all.map((r) => [r.registrationId, r]));
  const memberIds = await memberRegistrationIdsForTeam(team);
  const members = memberIds.map((id) => byId.get(id)).filter((r): r is Registration => Boolean(r));
  const ownerId = team.members.find((m) => m.isOwner)?.registrationId ?? memberIds[0];
  const lead =
    (ownerId ? byId.get(ownerId) : null) ??
    members.find((r) => admitted(r.status) && !HIDDEN_STATUSES.has(r.status)) ??
    members[0];
  if (!lead) return null;
  if (!admitted(lead.status)) return null;
  if (HIDDEN_STATUSES.has(lead.status)) return null;
  return lead;
}

export async function findCompeteLogin(
  eventId: string,
  code: string,
): Promise<{ registration: Registration; teamId: string } | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const hash = hashAccessCode(trimmed);
  let teamId: string | null = null;
  if (hash) {
    const { data } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("id")
      .eq("event_id", eventId)
      .eq("access_code_hash", hash)
      .maybeSingle();
    if (data?.id) teamId = String(data.id);
  }
  if (!teamId) {
    const { data } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("id")
      .eq("event_id", eventId)
      .eq("join_code", trimmed.toUpperCase())
      .maybeSingle();
    if (data?.id) teamId = String(data.id);
  }
  if (!teamId) return null;
  const { data: teamRow, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select(HACKATHON_TEAM_COLS)
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw error;
  if (!teamRow) return null;
  const team = mapToTeam(teamRow, teamRow.id);
  const registration = await leadForTeamDoc(eventId, team);
  if (!registration) return null;
  return { registration, teamId };
}

export async function findRegistrationByAccessCode(
  eventId: string,
  code: string,
): Promise<Registration | null> {
  const found = await findCompeteLogin(eventId, code);
  return found?.registration ?? null;
}

export function teamAccessCodeVisible(team: HackathonTeam | null | undefined): string | null {
  return team?.accessCode || null;
}
