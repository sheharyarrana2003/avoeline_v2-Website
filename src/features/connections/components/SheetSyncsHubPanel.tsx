"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { OwnerSheetSyncRow } from "../server/sheetSync.service";
import { setSheetKeepInSyncAction } from "../actions/sheets.action";
import { buttonClass } from "@/src/lib/ui";

export function SheetSyncsHubPanel({
  ownerId,
  syncs,
}: {
  ownerId: string;
  syncs: OwnerSheetSyncRow[];
}) {
  const [pending, start] = useTransition();

  if (!syncs.length) {
    return (
      <p className="text-sm text-ink-soft">
        No Google Sheets exports yet. Open an event’s{" "}
        <strong className="font-medium text-ink">Exports</strong> tab to create a live sheet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
      {syncs.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {s.kind}
              <span className="ml-2 font-normal text-ink-soft">
                · {s.keepInSync ? "keeping in sync" : "one-shot"} · {s.status}
              </span>
            </p>
            <p className="truncate text-xs text-ink-soft">
              {s.lastSyncedAt
                ? `Last sync ${new Date(s.lastSyncedAt).toLocaleString()}`
                : "Not synced yet"}
            </p>
            {s.lastError ? <p className="text-xs text-red-700">{s.lastError}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={s.webUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonClass("secondary", "sm")}
            >
              Open sheet
            </a>
            <Link
              href={`/organizer/${ownerId}/events/${s.eventId}/exports`}
              className={buttonClass("secondary", "sm")}
            >
              Event Exports
            </Link>
            {s.keepInSync ? (
              <button
                type="button"
                disabled={pending}
                className={buttonClass("ghost", "sm")}
                onClick={() =>
                  start(async () => {
                    await setSheetKeepInSyncAction({
                      eventId: s.eventId,
                      connectionId: s.connectionId,
                      kind: s.kind as "attendees" | "checkin" | "hackathon_teams",
                      keepInSync: false,
                    });
                    window.location.reload();
                  })
                }
              >
                Stop sync
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
