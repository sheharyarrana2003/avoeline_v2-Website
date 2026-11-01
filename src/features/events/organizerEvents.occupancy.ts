/**
 * Pure occupancy helpers for My Events list (team/group = one registration).
 * Batch loading lives in organizerEvents.stats.ts — keep this client-safe / unit-testable.
 */

import {
  occupyingGroupRegs,
  occupyingHackathonRegs,
  registrationCountsTowardCapacity,
} from "@/src/features/registration/occupancy";
import type { Registration } from "@/src/services/models/reg.type";

export type OccupancyTeam = {
  members: { registrationId: string; isOwner: boolean }[];
};

export type OccupancyGroup = {
  leadRegistrationId: string | null;
  memberIds: string[];
};

export type EventOccupancyInput = {
  regs: Registration[];
  isHackathon: boolean;
  allowGroupRegistration: boolean;
  teams?: OccupancyTeam[];
  groups?: OccupancyGroup[];
};

/**
 * Occupying registrations for one event — same rules as Attendees tab.
 * Team of N → 1 occupying reg; solo → 1; cancelled/rejected/participants excluded.
 */
export function occupyingRegsForEvent(input: EventOccupancyInput): Registration[] {
  const { regs, isHackathon, allowGroupRegistration, teams = [], groups = [] } = input;
  if (isHackathon) return occupyingHackathonRegs(regs, teams);
  if (allowGroupRegistration) return occupyingGroupRegs(regs, groups);
  return regs.filter(registrationCountsTowardCapacity);
}

export function occupancyCount(input: EventOccupancyInput): number {
  return occupyingRegsForEvent(input).length;
}

export function checkedInAmongOccupying(occupying: Registration[]): number {
  return occupying.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    return s === "checked_in" || s === "attended" || r.checkIn?.checkedIn === true;
  }).length;
}

export function revenueAmongOccupying(occupying: Registration[]): number {
  let sum = 0;
  for (const r of occupying) {
    sum += Number(r.payment?.amountPaid ?? r.finalPrice ?? 0) || 0;
  }
  return sum;
}

export type EventOccupancyTally = {
  registrations: number;
  checkedIn: number;
  revenue: number;
  /** Raw people rows (non-cancelled) — for optional sub-lines. */
  people: number;
};

export function tallyOccupancy(input: EventOccupancyInput): EventOccupancyTally {
  const occupying = occupyingRegsForEvent(input);
  const people = input.regs.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    return s !== "cancelled" && s !== "rejected";
  }).length;
  return {
    registrations: occupying.length,
    checkedIn: checkedInAmongOccupying(occupying),
    revenue: revenueAmongOccupying(occupying),
    people,
  };
}
