/** Build a minimal .ics calendar invite for interview scheduling. */

import {
  buildIcs,
  googleCalendarTemplateUrl,
} from "@/src/features/connections/lib/calendarFallbacks";

export function buildInterviewIcs(input: {
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes?: number;
  location?: string;
  url?: string;
}): string {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 45) * 60_000);
  const desc = [input.description, input.url].filter(Boolean).join("\n");
  return buildIcs({
    uid: `interview-${start.toISOString()}`,
    title: input.title,
    description: desc || undefined,
    location: input.location,
    url: input.url,
    start,
    end,
  });
}

export function interviewGoogleCalendarUrl(input: {
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes?: number;
  location?: string;
  url?: string;
}): string {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 45) * 60_000);
  return googleCalendarTemplateUrl({
    uid: `interview-${start.toISOString()}`,
    title: input.title,
    description: input.description,
    location: input.location,
    url: input.url,
    start,
    end,
  });
}

export function interviewIcsDataUrl(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
