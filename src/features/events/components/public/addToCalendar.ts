import type { PublicEventDto } from "@/src/features/events/types";
import { parseScheduleDateTime } from "@/src/lib/datetime";

/** Build a downloadable .ics blob URL for the event schedule. */
export function buildEventIcs(
  dto: Pick<
    PublicEventDto,
    "id" | "title" | "shortDescription" | "schedule" | "location" | "sharePath"
  >,
): string {
  const start = parseScheduleDateTime(dto.schedule.startDate, dto.schedule.startTime) ?? new Date();
  const end =
    parseScheduleDateTime(dto.schedule.endDate || dto.schedule.startDate, dto.schedule.endTime) ??
    new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const location = [dto.location.venueName, dto.location.address, dto.location.city]
    .filter(Boolean)
    .join(", ");

  const escape = (s: string) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avoeline//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${dto.id}@avoeline`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(dto.title)}`,
    dto.shortDescription ? `DESCRIPTION:${escape(dto.shortDescription)}` : null,
    location ? `LOCATION:${escape(location)}` : null,
    dto.sharePath ? `URL:${escape(dto.sharePath)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function downloadEventIcs(dto: Parameters<typeof buildEventIcs>[0]): void {
  const ics = buildEventIcs(dto);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(dto.title || "event").replace(/[^\w\-]+/g, "_").slice(0, 60)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
