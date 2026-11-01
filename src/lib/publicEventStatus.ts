import { toDate } from "@/src/lib/datetime";
import type { EventLifecycle } from "@/src/lib/eventState";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";

export type PublicEventBanner = {
  lifecycle: EventLifecycle;
  /** Registration / join is open (lifecycle + optional open/close dates). */
  registrationOpen: boolean;
  /** Show a status banner above the page. */
  banner: string | null;
};

export type RegistrationWindow = {
  registrationOpenDate?: string | null;
  registrationCloseDate?: string | null;
};

/**
 * Whether the event's registration open/close dates currently allow signup.
 * Missing dates mean "no extra window constraint". Close date is end-of-day local.
 */
export function isWithinRegistrationDates(
  registration: RegistrationWindow | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!registration) return true;

  const opens = toDate(registration.registrationOpenDate);
  if (opens) {
    const start = new Date(opens);
    start.setHours(0, 0, 0, 0);
    if (now < start) return false;
  }

  const closes = toDate(registration.registrationCloseDate);
  if (closes) {
    const end = new Date(closes);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }

  return true;
}

export function publicEventPresentation(
  status: string | null | undefined,
  schedule: Parameters<typeof eventLifecycle>[1],
  registration?: RegistrationWindow | null,
  now: Date = new Date(),
): PublicEventBanner {
  const lifecycle = eventLifecycle(status, schedule, now);
  const lifecycleAllows = isActiveLifecycle(lifecycle);
  const datesAllow = isWithinRegistrationDates(registration, now);
  const registrationOpen = lifecycleAllows && datesAllow;

  const banners: Partial<Record<EventLifecycle, string>> = {
    completed: "Completed — registration closed",
    cancelled: "Cancelled — registration closed",
    archived: "Archived — registration closed",
    draft: "Draft preview — not published",
  };

  let banner = banners[lifecycle] ?? null;
  if (!banner && lifecycleAllows && !datesAllow) {
    banner = "Registration is closed for this event.";
  }

  return {
    lifecycle,
    registrationOpen,
    banner,
  };
}

/** Competition still accepts new entrants (not ended; registration_closes_at not past). */
export function trackRegistrationOpen(
  track: { status?: string | null; registrationClosesAt?: string | null },
  now: Date = new Date(),
): boolean {
  if (String(track.status || "").toLowerCase() === "ended") return false;
  const closes = track.registrationClosesAt ? Date.parse(track.registrationClosesAt) : NaN;
  if (Number.isFinite(closes) && closes < now.getTime()) return false;
  return true;
}
