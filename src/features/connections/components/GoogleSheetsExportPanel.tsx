"use client";

import { useEffect, useState, useTransition } from "react";
import { listMyDriveConnectionsAction } from "../actions/drive.action";
import {
  createTemplateDocAction,
  exportToGoogleSheetAction,
  listSheetSyncsAction,
  setSheetKeepInSyncAction,
} from "../actions/sheets.action";
import { NeedsConnection } from "./NeedsConnection";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export function GoogleSheetsExportPanel({
  eventId,
  organizerId,
  showHackathonTeams,
}: {
  eventId: string;
  organizerId: string;
  showHackathonTeams?: boolean;
}) {
  const [connections, setConnections] = useState<Array<{ id: string; email: string }>>([]);
  const [connectionId, setConnectionId] = useState("");
  const [syncs, setSyncs] = useState<
    Array<{
      kind: string;
      webUrl: string;
      keepInSync: boolean;
      status: string;
      lastError: string | null;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reload() {
    start(async () => {
      const [c, s] = await Promise.all([
        listMyDriveConnectionsAction({}),
        listSheetSyncsAction({ eventId }),
      ]);
      if (c.ok) {
        setConnections(c.data.connections);
        setConnectionId((prev) => prev || c.data.connections[0]?.id || "");
      }
      if (s.ok) setSyncs(s.data.syncs);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const kinds: Array<{ kind: "attendees" | "checkin" | "hackathon_teams"; label: string }> = [
    { kind: "attendees", label: "Attendees" },
    { kind: "checkin", label: "Check-in log" },
    ...(showHackathonTeams ? [{ kind: "hackathon_teams" as const, label: "Hackathon teams" }] : []),
  ];

  return (
    <section className="mt-8 space-y-4 rounded-2xl border border-line bg-paper p-5">
      <div>
        <h2 className="font-display text-lg text-ink">Google Sheets</h2>
        <p className="text-sm text-ink-soft">
          One-off export or keep a sheet in sync (one-way). Cells are sanitized against formula
          injection. Only sheets this app creates are updated.
        </p>
      </div>

      {!connections.length ? (
        <NeedsConnection
          capability="drive.files"
          ownerId={organizerId}
          message="Connect Google Drive to export to Sheets"
        />
      ) : (
        <>
          <label className="block text-xs text-ink">
            Drive account
            <select
              className={`${fieldClass} mt-1 max-w-sm`}
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </select>
          </label>

          <ul className="divide-y divide-line">
            {kinds.map(({ kind, label }) => {
              const sync = syncs.find((s) => s.kind === kind);
              return (
                <li
                  key={kind}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{label}</p>
                    {sync ? (
                      <p className="text-xs text-ink-soft">
                        {sync.status}
                        {sync.keepInSync ? " · keeping in sync" : ""}
                        {sync.lastError ? ` — ${sync.lastError}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-soft">Not exported yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sync?.webUrl ? (
                      <a
                        href={sync.webUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium underline"
                      >
                        Open sheet
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending || !connectionId}
                      className={buttonClass("secondary", "sm")}
                      onClick={() =>
                        start(async () => {
                          setMessage(null);
                          const r = await exportToGoogleSheetAction({
                            eventId,
                            connectionId,
                            kind,
                            keepInSync: false,
                          });
                          setMessage(r.ok ? "Exported to Google Sheets." : r.error.message);
                          reload();
                        })
                      }
                    >
                      Export once
                    </button>
                    {sync?.keepInSync ? (
                      <button
                        type="button"
                        disabled={pending || !connectionId}
                        className={buttonClass("secondary", "sm")}
                        onClick={() =>
                          start(async () => {
                            setMessage(null);
                            const r = await setSheetKeepInSyncAction({
                              eventId,
                              connectionId,
                              kind,
                              keepInSync: false,
                            });
                            setMessage(r.ok ? "Keep-in-sync stopped." : r.error.message);
                            reload();
                          })
                        }
                      >
                        Stop sync
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending || !connectionId}
                        className={buttonClass("primary", "sm")}
                        onClick={() =>
                          start(async () => {
                            setMessage(null);
                            const r = await exportToGoogleSheetAction({
                              eventId,
                              connectionId,
                              kind,
                              keepInSync: true,
                            });
                            setMessage(
                              r.ok ? "Sheet created and keep-in-sync enabled." : r.error.message,
                            );
                            reload();
                          })
                        }
                      >
                        Keep in sync
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line pt-4">
            <p className="mb-2 text-sm font-medium text-ink">Templates</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["run_of_show", "Run of show"],
                  ["sponsor_tracker", "Sponsor tracker"],
                  ["mou_draft", "MoU draft"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  disabled={pending || !connectionId}
                  className={buttonClass("secondary", "sm")}
                  onClick={() =>
                    start(async () => {
                      setMessage(null);
                      const r = await createTemplateDocAction({
                        eventId,
                        connectionId,
                        kind,
                      });
                      if (r.ok) {
                        setMessage(`${label} created.`);
                        if (r.data.webUrl)
                          window.open(r.data.webUrl, "_blank", "noopener,noreferrer");
                      } else setMessage(r.error.message);
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {message ? <p className="text-xs text-ink-soft">{message}</p> : null}
    </section>
  );
}
