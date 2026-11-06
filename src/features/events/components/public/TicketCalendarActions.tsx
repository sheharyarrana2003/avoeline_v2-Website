"use client";

import { CalendarPlus } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { downloadEventIcs, eventGoogleCalendarUrl } from "./addToCalendar";
import type { PublicEventDto } from "@/src/features/events/types";

type EventCal = Pick<
  PublicEventDto,
  "id" | "title" | "shortDescription" | "schedule" | "location" | "sharePath"
>;

export function TicketCalendarActions({ event }: { event: EventCal }) {
  const googleUrl = eventGoogleCalendarUrl(event);
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => downloadEventIcs(event)}
        className={buttonClass("secondary", "sm")}
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Download .ics
      </button>
      <a
        href={googleUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonClass("secondary", "sm")}
      >
        Add to Google Calendar
      </a>
    </div>
  );
}
