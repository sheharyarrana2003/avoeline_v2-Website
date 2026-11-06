import type { PublicEventDto } from "@/src/features/events/types";
import { parseScheduleDateTime } from "@/src/lib/datetime";
import {
  buildIcs,
  googleCalendarTemplateUrl,
  type CalendarFallbackInput,
} from "@/src/features/connections/lib/calendarFallbacks";

function eventFallbackInput(
  dto: Pick<
    PublicEventDto,
    "id" | "title" | "shortDescription" | "schedule" | "location" | "sharePath"
  >,
): CalendarFallbackInput {
  const start = parseScheduleDateTime(dto.schedule.startDate, dto.schedule.startTime) ?? new Date();
  const end =
    parseScheduleDateTime(dto.schedule.endDate || dto.schedule.startDate, dto.schedule.endTime) ??
    new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const location = [dto.location.venueName, dto.location.address, dto.location.city]
    .filter(Boolean)
    .join(", ");

  return {
    uid: dto.id,
    title: dto.title,
    description: dto.shortDescription || undefined,
    location: location || undefined,
    url: dto.sharePath || undefined,
    start,
    end,
  };
}

/** Build a downloadable .ics blob contents for the event schedule. */
export function buildEventIcs(
  dto: Pick<
    PublicEventDto,
    "id" | "title" | "shortDescription" | "schedule" | "location" | "sharePath"
  >,
): string {
  return buildIcs(eventFallbackInput(dto));
}

export function eventGoogleCalendarUrl(
  dto: Pick<
    PublicEventDto,
    "id" | "title" | "shortDescription" | "schedule" | "location" | "sharePath"
  >,
): string {
  return googleCalendarTemplateUrl(eventFallbackInput(dto));
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
