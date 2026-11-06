"use client";

import { useTransition } from "react";
import type { OwnerCalendarLinkRow } from "../server/calendarSync.service";
import { removeEntityFromCalendarAction } from "../actions/calendar.action";
import type { CalendarEntityType } from "../types";
import { buttonClass } from "@/src/lib/ui";

const ENTITY_LABEL: Record<string, string> = {
  event: "Event",
  agenda_item: "Agenda",
  interview: "Interview",
  mentor_slot: "Mentor slot",
  judging_session: "Judging",
  hackathon_session: "Hackathon session",
};

export function CalendarLinksHubPanel({ links }: { links: OwnerCalendarLinkRow[] }) {
  const [pending, start] = useTransition();

  if (!links.length) {
    return (
      <p className="text-sm text-ink-soft">
        No calendar syncs yet. Push an event schedule, agenda session, or interview to Google from
        those screens — they will show up here so you can open or unlink them.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
      {links.map((link) => (
        <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {ENTITY_LABEL[link.entityType] || link.entityType}
              <span className="ml-2 font-normal text-ink-soft">· {link.status}</span>
            </p>
            <p className="truncate text-xs text-ink-soft">
              {link.entityId}
              {link.lastSyncedAt ? ` · synced ${new Date(link.lastSyncedAt).toLocaleString()}` : ""}
            </p>
            {link.lastError ? <p className="text-xs text-red-700">{link.lastError}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {link.htmlLink ? (
              <a
                href={link.htmlLink}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("secondary", "sm")}
              >
                {link.meetUrl ? "Open Meet" : "Open Calendar"}
              </a>
            ) : null}
            <button
              type="button"
              disabled={pending}
              className={buttonClass("ghost", "sm")}
              onClick={() =>
                start(async () => {
                  await removeEntityFromCalendarAction({
                    connectionId: link.connectionId,
                    entityType: link.entityType as CalendarEntityType,
                    entityId: link.entityId,
                  });
                  window.location.reload();
                })
              }
            >
              Unlink
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
