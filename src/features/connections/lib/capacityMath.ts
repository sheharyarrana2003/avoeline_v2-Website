/** Pure capacity / schedule helpers (unit-testable; no server-only). */

export const RESERVE_RATIO = 0.2;
export const DEFAULT_TZ = "Asia/Karachi";
export const DEFAULT_GMAIL_DAILY = 400;
export const DEFAULT_WORKSPACE_DAILY = 1500;
export const DEFAULT_PER_MINUTE = 30;

export const TIME_SENSITIVE_KINDS = new Set([
  "registration_confirmed",
  "ticket",
  "access_code",
  "interview",
  "guest_invite",
]);

export function isTimeSensitiveKind(kind: string): boolean {
  return TIME_SENSITIVE_KINDS.has(kind);
}

export function computeReserve(providerDailyLimit: number): number {
  return Math.floor(providerDailyLimit * RESERVE_RATIO);
}

export function remainingNowOf(opts: {
  providerRemaining: number;
  planDailyRemaining: number;
  planMonthlyRemaining: number;
}): number {
  return Math.max(
    0,
    Math.min(opts.providerRemaining, opts.planDailyRemaining, opts.planMonthlyRemaining),
  );
}

export function remainingBulkOf(
  remainingNow: number,
  reserve: number,
  timeSensitive: boolean,
): number {
  if (timeSensitive) return remainingNow;
  return Math.max(0, remainingNow - reserve);
}

/** Parts of a civil date in a timezone (Intl). */
export function zonedParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Approximate UTC instant for Y-M-D HH:MM in timezone (handles DST via offset probe). */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const asLocal = zonedParts(utcGuess, timeZone);
  const desiredAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const actualAsUtcMs = Date.UTC(
    asLocal.year,
    asLocal.month - 1,
    asLocal.day,
    asLocal.hour,
    asLocal.minute,
    0,
  );
  return new Date(utcGuess.getTime() + (desiredAsUtcMs - actualAsUtcMs));
}

export function startOfMonthInTz(now: Date, timeZone: string): Date {
  const p = zonedParts(now, timeZone);
  return zonedLocalToUtc(p.year, p.month, 1, 0, 0, timeZone);
}

export function nextMonthStartInTz(now: Date, timeZone: string): Date {
  const p = zonedParts(now, timeZone);
  const nextMonth = p.month === 12 ? 1 : p.month + 1;
  const nextYear = p.month === 12 ? p.year + 1 : p.year;
  return zonedLocalToUtc(nextYear, nextMonth, 1, 0, 0, timeZone);
}

/** Next 09:00 local at or after `from` (if already past 9 today, tomorrow 9). */
export function nextNineAmLocal(from: Date, timeZone: string): Date {
  const p = zonedParts(from, timeZone);
  let candidate = zonedLocalToUtc(p.year, p.month, p.day, 9, 0, timeZone);
  if (candidate.getTime() <= from.getTime()) {
    const tomorrow = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const t = zonedParts(tomorrow, timeZone);
    candidate = zonedLocalToUtc(t.year, t.month, t.day, 9, 0, timeZone);
  }
  return candidate;
}

export function addLocalDays(base: Date, days: number, timeZone: string): Date {
  const p = zonedParts(base, timeZone);
  const utcNoon = Date.UTC(p.year, p.month - 1, p.day + days, 12, 0, 0);
  const shifted = new Date(utcNoon);
  const s = zonedParts(shifted, timeZone);
  return zonedLocalToUtc(s.year, s.month, s.day, p.hour, p.minute, timeZone);
}

export type ScheduleChunk = { notBefore: string; count: number };

/**
 * Build sendNow + schedule for overflow.
 * @param mode send_and_schedule | spread_days
 */
export function buildSchedule(opts: {
  total: number;
  sendNow: number;
  startAt: Date;
  timeZone: string;
  mode: "send_and_schedule" | "spread_days";
  spreadDays?: number;
  dailyChunk: number;
}): { schedule: ScheduleChunk[]; eta: string | null } {
  const remaining = Math.max(0, opts.total - opts.sendNow);
  if (remaining === 0) return { schedule: [], eta: null };

  const schedule: ScheduleChunk[] = [];
  if (opts.mode === "spread_days") {
    const days = Math.max(1, opts.spreadDays || 1);
    const base = Math.floor(remaining / days);
    let leftover = remaining - base * days;
    for (let i = 0; i < days; i++) {
      const count = base + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover -= 1;
      if (count <= 0) continue;
      const when = i === 0 ? opts.startAt : addLocalDays(opts.startAt, i, opts.timeZone);
      schedule.push({ notBefore: when.toISOString(), count });
    }
  } else {
    let left = remaining;
    let day = 0;
    const chunk = Math.max(1, opts.dailyChunk);
    while (left > 0) {
      const count = Math.min(chunk, left);
      const when = day === 0 ? opts.startAt : addLocalDays(opts.startAt, day, opts.timeZone);
      schedule.push({ notBefore: when.toISOString(), count });
      left -= count;
      day += 1;
    }
  }
  const eta = schedule.length ? schedule[schedule.length - 1]!.notBefore : null;
  return { schedule, eta };
}

/** When the next slot frees from a rolling 24h window given sent_at timestamps (ISO). */
export function nextFreeAtFromTimestamps(
  sentAts: string[],
  dailyLimit: number,
  nowMs = Date.now(),
): string | null {
  if (sentAts.length < dailyLimit) return null;
  const sorted = [...sentAts]
    .map((s) => new Date(s).getTime())
    .filter((t) => Number.isFinite(t) && t > nowMs - 24 * 60 * 60 * 1000)
    .sort((a, b) => a - b);
  if (sorted.length < dailyLimit) return null;
  const index = sorted.length - dailyLimit;
  const freeAt = sorted[index]! + 24 * 60 * 60 * 1000;
  return new Date(freeAt).toISOString();
}
