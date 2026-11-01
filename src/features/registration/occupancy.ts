import type { Registration } from "@/src/services/models/reg.type";

/**
 * A person counts against event capacity unless withdrawn, or they are an extra
 * hackathon teammate / group member. One team is one registration unit (the lead).
 */
export function registrationCountsTowardCapacity(reg: Registration): boolean {
  if (reg.status === "cancelled" || reg.status === "rejected") return false;
  if (reg.hackathonRole === "participant") return false;
  if (reg.groupRole === "member") return false;
  return true;
}

/** One team (its lead) plus people not on a team. Extra members are not a second booking. */
export function occupyingHackathonRegs(
  regs: Registration[],
  teams: { members: { registrationId: string; isOwner: boolean }[] }[],
): Registration[] {
  const extras = new Set(
    teams.flatMap((t) => t.members.filter((m) => !m.isOwner).map((m) => m.registrationId)),
  );
  return regs.filter((r) => registrationCountsTowardCapacity(r) && !extras.has(r.registrationId));
}

/** One regular group is one seat (the lead). Extra members do not occupy another booking. */
export function occupyingGroupRegs(
  regs: Registration[],
  groups: { leadRegistrationId: string | null; memberIds: string[] }[],
): Registration[] {
  const extras = new Set<string>();
  for (const g of groups) {
    for (const id of g.memberIds) {
      if (id && id !== g.leadRegistrationId) extras.add(id);
    }
  }
  for (const r of regs) {
    if (r.groupRole === "member") extras.add(r.registrationId);
  }
  return regs.filter((r) => registrationCountsTowardCapacity(r) && !extras.has(r.registrationId));
}

/** Occupancy across mixed hackathon + group + solo events (dashboard / analytics). */
export function occupyingRegsForOrganizer(
  regs: Registration[],
  teams: { members: { registrationId: string; isOwner: boolean }[] }[],
  groups: { leadRegistrationId: string | null; memberIds: string[] }[],
): Registration[] {
  return occupyingGroupRegs(occupyingHackathonRegs(regs, teams), groups);
}
