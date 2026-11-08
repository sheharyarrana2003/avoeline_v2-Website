import { parseScheduleDateTime } from "@/src/lib/datetime";

export type OverlapSession = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  speakerIds: string[];
};

export type OverlapWarning = {
  kind: "location" | "speaker";
  withId: string;
  withTitle: string;
  detail: string;
};

function rangeMs(date: string, start: string, end: string): { a: number; b: number } | null {
  const startDt = parseScheduleDateTime(date, start) || tryClock(date, start);
  const endDt = parseScheduleDateTime(date, end) || tryClock(date, end);
  if (!startDt || !endDt) return null;
  const a = startDt.getTime();
  const b = endDt.getTime();
  if (!(b > a)) return null;
  return { a, b };
}

function tryClock(date: string, clock: string): Date | null {
  // Accept 24h HH:mm when parseScheduleDateTime expects 12h display times
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(clock).trim());
  if (!m) return null;
  const iso = String(date).includes("/")
    ? null
    : new Date(`${date}T${m[1]!.padStart(2, "0")}:${m[2]}:00`);
  if (iso && !Number.isNaN(iso.getTime())) return iso;
  return null;
}

function overlaps(a: { a: number; b: number }, b: { a: number; b: number }): boolean {
  return a.a < b.b && b.a < a.b;
}

function normLoc(loc: string): string {
  return String(loc || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Warn-only: same location or shared speaker with overlapping time on the same day. */
export function findAgendaOverlaps(
  existing: OverlapSession[],
  candidate: OverlapSession,
): OverlapWarning[] {
  const candRange = rangeMs(candidate.date, candidate.startTime, candidate.endTime);
  if (!candRange) return [];
  const candLoc = normLoc(candidate.location);
  const candSpeakers = new Set(candidate.speakerIds.filter(Boolean));
  const warnings: OverlapWarning[] = [];

  for (const other of existing) {
    if (other.id && candidate.id && other.id === candidate.id) continue;
    if (String(other.date) !== String(candidate.date)) continue;
    const otherRange = rangeMs(other.date, other.startTime, other.endTime);
    if (!otherRange || !overlaps(candRange, otherRange)) continue;

    if (candLoc && candLoc === normLoc(other.location)) {
      warnings.push({
        kind: "location",
        withId: other.id,
        withTitle: other.title,
        detail: `Overlaps “${other.title}” in the same location`,
      });
    }
    for (const sid of other.speakerIds) {
      if (candSpeakers.has(sid)) {
        warnings.push({
          kind: "speaker",
          withId: other.id,
          withTitle: other.title,
          detail: `Speaker also on “${other.title}” at this time`,
        });
        break;
      }
    }
  }
  return warnings;
}
