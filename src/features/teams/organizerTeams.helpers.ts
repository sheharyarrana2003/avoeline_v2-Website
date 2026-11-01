import type {
  OrganizerAccessGrantSummary,
  TeamMemberDoc,
  TeamMemberRole,
  TeamWithMembers,
} from "./teamEngine.types";

export type MemberAccessStatus = "none" | "invited" | "active" | "revoked";

export const ACCESS_STATUS_LABEL: Record<MemberAccessStatus, string> = {
  none: "None",
  invited: "Invited",
  active: "Active",
  revoked: "Revoked",
};

export function normalizeTeamEmail(email: string | null | undefined): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/** True when `candidate` already appears in `emails` (case-insensitive), optionally skipping one index. */
export function hasDuplicateEmailInList(
  emails: Array<string | null | undefined>,
  candidate: string,
  excludeIndex?: number,
): boolean {
  const needle = normalizeTeamEmail(candidate);
  if (!needle) return false;
  return emails.some((e, i) => {
    if (excludeIndex != null && i === excludeIndex) return false;
    return normalizeTeamEmail(e) === needle;
  });
}

/** Find first member (other than excludeMemberId) whose email matches. */
export function findMemberWithEmail(
  members: Array<{ id: string; email?: string | null }>,
  email: string,
  excludeMemberId?: string,
): { id: string } | null {
  const needle = normalizeTeamEmail(email);
  if (!needle) return null;
  for (const m of members) {
    if (excludeMemberId && m.id === excludeMemberId) continue;
    if (normalizeTeamEmail(m.email) === needle) return { id: m.id };
  }
  return null;
}

/** After promoting `memberId` to lead, every other lead becomes member. */
export function rolesAfterMakeLead<T extends { id: string; role: TeamMemberRole }>(
  members: T[],
  memberId: string,
): T[] {
  return members.map((m) => ({
    ...m,
    role: (m.id === memberId ? "lead" : m.role === "lead" ? "member" : m.role) as TeamMemberRole,
  }));
}

export function memberDisplayName(
  m: Pick<TeamMemberDoc, "displayName" | "email" | "user">,
): string {
  return m.displayName || m.user?.name || m.email || "Member";
}

export function memberEmail(m: Pick<TeamMemberDoc, "email" | "user">): string {
  return m.email || m.user?.email || "";
}

export function leadOf(team: TeamWithMembers): TeamMemberDoc | undefined {
  return team.members.find((m) => m.role === "lead") ?? team.members[0];
}

export function initialFromName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

/**
 * Best matching grant for a roster member (by user id). Prefer active over invited over revoked.
 */
export function accessStatusForMember(
  member: { userId?: string | null },
  grants: OrganizerAccessGrantSummary[],
): MemberAccessStatus {
  const uid = String(member.userId || "").trim();
  if (!uid) return "none";
  const mine = grants.filter((g) => g.granteeUserId === uid);
  if (!mine.length) return "none";
  const active = mine.find((g) => !g.revokedAt && !g.inviteTokenHash);
  if (active) return "active";
  const invited = mine.find((g) => !g.revokedAt && g.inviteTokenHash);
  if (invited) return "invited";
  if (mine.some((g) => g.revokedAt)) return "revoked";
  return "none";
}

export function countActiveAccessForTeam(
  team: TeamWithMembers,
  grants: OrganizerAccessGrantSummary[],
): number {
  let n = 0;
  for (const m of team.members) {
    const s = accessStatusForMember(m, grants);
    if (s === "active" || s === "invited") n += 1;
  }
  return n;
}

export function teamStatusLabel(team: TeamWithMembers): string {
  if (!team.members.length) return "Empty";
  return "Active";
}

export function parseTeamExtra(raw: unknown): { description: string; teamType: string } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    description: String(obj.description ?? ""),
    teamType: String(obj.teamType ?? obj.type ?? ""),
  };
}

export function parseMemberExtra(raw: unknown): { designation: string; notes: string } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    designation: String(obj.designation ?? ""),
    notes: String(obj.notes ?? ""),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Soft phone check: digits/spaces/+/-/(/), length 7–20 after stripping non-digits for digit count. */
export function isValidTeamPhone(phone: string): boolean {
  const t = phone.trim();
  if (!t) return true;
  if (!/^[+\d\s().-]+$/.test(t)) return false;
  const digits = t.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidTeamEmail(email: string): boolean {
  const t = normalizeTeamEmail(email);
  if (!t) return false;
  return EMAIL_RE.test(t);
}
