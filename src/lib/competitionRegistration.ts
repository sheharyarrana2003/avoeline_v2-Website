import { toDate } from "@/src/lib/datetime";

export type CompetitionRegisterState = "open" | "closed" | "full";

/** Prefer competition close; else event close (date-only → end of local day). */
export function effectiveRegistrationClosesAt(
  trackClosesAt: string | null | undefined,
  eventClosesAt: string | null | undefined,
): string | null {
  const track = String(trackClosesAt || "").trim();
  if (track) return track;
  const eventClose = String(eventClosesAt || "").trim();
  if (!eventClose) return null;
  const d = toDate(eventClose);
  if (!d) return eventClose;
  // Date-only YYYY-MM-DD → end of that local day
  if (/^\d{4}-\d{2}-\d{2}$/.test(eventClose)) {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }
  return d.toISOString();
}

export function competitionRegisterState(input: {
  effectiveClosesAt: string | null;
  trackEnded?: boolean;
  eventLifecycleActive: boolean;
  seatsLeft: number | null;
  waitlistEnabled: boolean;
  now?: Date;
}): CompetitionRegisterState {
  const now = input.now ?? new Date();
  if (!input.eventLifecycleActive || input.trackEnded) return "closed";
  if (input.effectiveClosesAt) {
    const closes = Date.parse(input.effectiveClosesAt);
    if (Number.isFinite(closes) && closes < now.getTime()) return "closed";
  }
  if (input.seatsLeft === 0 && !input.waitlistEnabled) return "full";
  return "open";
}

/** Compatibility boolean used by registration form filters. */
export function isCompetitionRegistrationOpen(state: CompetitionRegisterState): boolean {
  return state === "open";
}
