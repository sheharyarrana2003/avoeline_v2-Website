"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import type { PublicEventDto } from "@/src/features/events/types";
import { downloadEventIcs, eventGoogleCalendarUrl } from "./addToCalendar";
import { calendarActionsAllowed } from "./publicPage.logic";

export function PublicCalendarMenu({ dto, preview }: { dto: PublicEventDto; preview: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!calendarActionsAllowed(dto, preview)) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Add to calendar
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute left-0 z-20 mt-2 min-w-[14rem] rounded-xl border border-line bg-paper py-1 shadow-md"
        >
          <li role="none">
            <a
              role="menuitem"
              href={eventGoogleCalendarUrl(dto)}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm text-ink hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Google Calendar
            </a>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-ink hover:bg-muted"
              onClick={() => {
                downloadEventIcs(dto);
                setOpen(false);
              }}
            >
              Apple / Outlook (.ics)
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
