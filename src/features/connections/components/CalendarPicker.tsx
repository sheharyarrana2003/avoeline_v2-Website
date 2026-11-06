"use client";

import { useEffect, useState, useTransition } from "react";
import { listWritableCalendarsAction, setSelectedCalendarAction } from "../actions/calendar.action";

export function CalendarPicker({ connectionId }: { connectionId: string }) {
  const [calendars, setCalendars] = useState<
    Array<{ id: string; summary: string; primary: boolean }>
  >([]);
  const [selected, setSelected] = useState("primary");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await listWritableCalendarsAction({ connectionId });
      if (r.ok) {
        setCalendars(r.data.calendars);
        setSelected(r.data.selected || "primary");
      } else {
        setMessage(r.error.message);
      }
    });
  }, [connectionId]);

  if (!calendars.length && !pending) {
    return message ? <p className="text-xs text-red-700">{message}</p> : null;
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-line bg-canvas/40 px-3 py-2 text-sm">
      <label className="block text-xs font-medium text-ink">
        Calendar for new events
        <select
          className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          value={selected}
          disabled={pending}
          onChange={(e) => {
            const calendarId = e.target.value;
            setSelected(calendarId);
            start(async () => {
              const r = await setSelectedCalendarAction({ connectionId, calendarId });
              setMessage(r.ok ? "Saved." : r.error.message);
            });
          }}
        >
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.summary}
              {c.primary ? " (primary)" : ""}
            </option>
          ))}
        </select>
      </label>
      {message ? <p className="text-[11px] text-ink-soft">{message}</p> : null}
    </div>
  );
}
