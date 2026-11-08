import { parseScheduleDateTime, toDate } from "@/src/lib/datetime";
import type { PublicAgendaItem } from "@/src/features/events/types";
import type { Session } from "@/src/services/models/agenda.model";

/** Calendar order for schedule day keys (ISO yyyy-mm-dd or legacy display dates). */
export function compareAgendaDayKeys(a: string, b: string): number {
  const da = toDate(a);
  const db = toDate(b);
  if (da && db) return da.getTime() - db.getTime();
  if (da) return -1;
  if (db) return 1;
  return String(a).localeCompare(String(b));
}

/** Start time order within a day (falls back to title). */
export function compareSessionsByStart(a: Session, b: Session): number {
  const ta = parseScheduleDateTime(a.date, a.startTime)?.getTime();
  const tb = parseScheduleDateTime(b.date, b.startTime)?.getTime();
  if (ta != null && tb != null && ta !== tb) return ta - tb;
  if (ta != null && tb == null) return -1;
  if (ta == null && tb != null) return 1;
  return (
    String(a.startTime || "").localeCompare(String(b.startTime || "")) ||
    a.title.localeCompare(b.title)
  );
}

export function sortSessionsBySchedule(sessions: Session[]): Session[] {
  return [...sessions].sort(compareSessionsByStart);
}

export function comparePublicAgendaItems(
  a: Pick<PublicAgendaItem, "date" | "startTime" | "title">,
  b: Pick<PublicAgendaItem, "date" | "startTime" | "title">,
): number {
  const day = compareAgendaDayKeys(a.date || "", b.date || "");
  if (day !== 0) return day;
  const ta = parseScheduleDateTime(a.date, a.startTime)?.getTime();
  const tb = parseScheduleDateTime(b.date, b.startTime)?.getTime();
  if (ta != null && tb != null && ta !== tb) return ta - tb;
  if (ta != null && tb == null) return -1;
  if (ta == null && tb != null) return 1;
  return (
    String(a.startTime || "").localeCompare(String(b.startTime || "")) ||
    a.title.localeCompare(b.title)
  );
}

export function sortPublicAgendaItems(items: PublicAgendaItem[]): PublicAgendaItem[] {
  return [...items].sort(comparePublicAgendaItems);
}
