/**
 * Pure helpers for the public event DTO / register CTA.
 * Kept free of `server-only` so unit tests can import without Next runtime.
 */

import { toDate } from "@/src/lib/datetime";
import type { EventLifecycle } from "@/src/lib/eventState";
import type { PublicOrgCredit, RegisterButtonState } from "./types";

/** Keys that must never appear on a client-facing public event payload. */
export const PUBLIC_EVENT_FORBIDDEN_KEYS = [
  "accessCode",
  "access_code",
  "meetingPassword",
  "meeting_password",
  "meetingLink",
  "meeting_link",
  "whitelist",
  "promoCodes",
  "promo_codes",
  "promoHints",
  "promo_hints",
  "code",
  "iban",
  "bankName",
  "bank_name",
  "accountNumber",
  "account_number",
  "organizerEmail",
  "organizerPhone",
  "contactEmail",
  "contactPhone",
  "contractValue",
  "contract_value",
  "benefits",
  "flagHash",
  "flag_hash",
  "flag",
  "hint",
  "hints",
  "tasks",
  "inviteToken",
  "invite_token",
  "judgeLink",
  "judge_link",
  "judgeInviteUrl",
  "teamSecrets",
  "paymentScreenshot",
] as const;

export function dtoContainsForbiddenKey(value: unknown, path = ""): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = dtoContainsForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const full = path ? `${path}.${key}` : key;
    if ((PUBLIC_EVENT_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      return full;
    }
    const hit = dtoContainsForbiddenKey(child, full);
    if (hit) return hit;
  }
  return null;
}

/**
 * Register CTA state matrix for the public page (and tests).
 */
export function resolveRegisterButtonState(input: {
  preview: boolean;
  requiresRegistration: boolean;
  lifecycle: EventLifecycle;
  registrationOpen: boolean;
  registrationOpenDate: string;
  seatsLeft: number | null;
  waitlistEnabled: boolean;
  hasTracks: boolean;
  openCompetitionCount: number;
  now?: Date;
}): RegisterButtonState {
  const now = input.now ?? new Date();
  if (input.preview && input.lifecycle === "draft") return "admin_preview";
  if (!input.requiresRegistration) return "no_registration";
  if (
    input.lifecycle === "completed" ||
    input.lifecycle === "cancelled" ||
    input.lifecycle === "archived"
  ) {
    return "ended";
  }
  if (input.hasTracks && input.openCompetitionCount === 0) return "competitions_closed";

  const opens = toDate(input.registrationOpenDate);
  if (opens) {
    const start = new Date(opens);
    start.setHours(0, 0, 0, 0);
    if (now < start) return "opens_at";
  }

  if (!input.registrationOpen) return "closed";

  if (input.seatsLeft === 0) {
    return input.waitlistEnabled ? "waitlist" : "sold_out";
  }
  return "open";
}

/** Filter org credits by the three public show_* toggles. */
export function filterPublicOrgCredits(
  orgs: PublicOrgCredit[],
  toggles: { showSponsors: boolean; showCollaborators: boolean; showPartners: boolean },
): { sponsors: PublicOrgCredit[]; collaborators: PublicOrgCredit[]; partners: PublicOrgCredit[] } {
  return {
    sponsors: toggles.showSponsors ? orgs.filter((o) => o.type === "sponsor") : [],
    collaborators: toggles.showCollaborators ? orgs.filter((o) => o.type === "collaborator") : [],
    partners: toggles.showPartners ? orgs.filter((o) => o.type === "partner") : [],
  };
}
