"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  listEventDriveFoldersAction,
  type EventDriveFoldersResult,
} from "../actions/listEventDriveFolders.action";
import type { SafeActionResult } from "@/src/lib/safeAction";
import { buttonClass } from "@/src/lib/ui";

type FolderRow = {
  kind: string;
  name: string;
  folderId: string;
  webViewLink: string | null;
};

export function EventDriveFoldersPanel({
  eventId,
  connectionsHref,
}: {
  eventId: string;
  connectionsHref: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);

  const reload = useCallback(() => {
    start(async () => {
      setError(null);
      const res: SafeActionResult<EventDriveFoldersResult> = await listEventDriveFoldersAction({
        eventId,
      });
      if (!res.ok) {
        setError(res.error.message);
        setConnected(null);
        setFolders([]);
        return;
      }
      const data = res.data;
      setConnected(data.connected);
      setFolders(data.connected ? [...data.folders] : []);
    });
  }, [eventId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <section className="space-y-3 rounded-xl border border-line bg-white/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-ink">Event folders</h2>
          <p className="text-sm text-ink-soft">
            Standard Drive layout for proofs, certificates, media, exports, and submissions.
          </p>
        </div>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          disabled={pending}
          onClick={reload}
        >
          {pending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {connected === false ? (
        <div className="space-y-2 text-sm text-ink-soft">
          <p>Connect Google Drive to create and open event folders.</p>
          <Link href={connectionsHref} className={buttonClass("primary", "sm")}>
            Connect Google Drive
          </Link>
        </div>
      ) : null}

      {connected && folders.length > 0 ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {folders.map((f) => (
            <li
              key={f.folderId}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="text-ink">
                {f.kind === "event_root" ? (
                  <span className="font-medium">{f.name}</span>
                ) : (
                  <>
                    <span className="text-ink-soft">↳ </span>
                    {f.name}
                  </>
                )}
              </span>
              {f.webViewLink ? (
                <a
                  href={f.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-brand underline-offset-2 hover:underline"
                >
                  Open in Google
                </a>
              ) : (
                <span className="text-xs text-ink-soft">Folder ready</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {connected && !folders.length && !pending && !error ? (
        <p className="text-sm text-ink-soft">No folders yet. Refresh to ensure the event tree.</p>
      ) : null}
    </section>
  );
}
