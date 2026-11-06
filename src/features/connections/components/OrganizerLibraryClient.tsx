"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { listLinkedFilesAction, listMyDriveConnectionsAction } from "../actions/drive.action";
import { mimeContainsForFamily, mimeFamily } from "../lib/linkedFiles.logic";
import type { LinkedFilePublic } from "../types";
import { CreateDriveFileMenu } from "./CreateDriveFileMenu";
import { FilePickerButton } from "./FilePickerButton";
import { LibraryList } from "./LibraryList";
import { NeedsConnection } from "./NeedsConnection";
import { fieldClass } from "@/src/lib/ui";

type MimeChip = "" | "doc" | "sheet" | "slides" | "other";

/**
 * Org-wide library for an organizer (owner_type user, owner_id = organizer).
 * Entity binding uses a synthetic "event" bucket keyed by organizer id when
 * picking from this page without a specific entity — prefer entity panels.
 */
export function OrganizerLibraryClient({ organizerId }: { organizerId: string }) {
  const [connections, setConnections] = useState<Array<{ id: string; email: string }>>([]);
  const [connectionId, setConnectionId] = useState("");
  const [files, setFiles] = useState<LinkedFilePublic[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [entityFilter, setEntityFilter] = useState<"" | "event" | "team" | "club" | "booking">("");
  const [mimeChip, setMimeChip] = useState<MimeChip>("");
  const [addedByMe, setAddedByMe] = useState(false);
  const [pending, start] = useTransition();

  const loadPage = useCallback(
    (cursor?: string | null, append = false) => {
      start(async () => {
        const list = await listLinkedFilesAction({
          ownerType: "user",
          ownerId: organizerId,
          entityType: entityFilter || undefined,
          q: q || undefined,
          mimeContains: mimeContainsForFamily(mimeChip) || undefined,
          addedBy: addedByMe ? organizerId : undefined,
          cursor: cursor || undefined,
          limit: 40,
        });
        if (!list.ok) return;
        setFiles((prev) => (append ? [...prev, ...list.data.files] : list.data.files));
        setNextCursor(list.data.nextCursor);
      });
    },
    [organizerId, entityFilter, q, mimeChip, addedByMe],
  );

  const reload = useCallback(() => {
    setNextCursor(null);
    loadPage(null, false);
  }, [loadPage]);

  useEffect(() => {
    start(async () => {
      const c = await listMyDriveConnectionsAction({});
      if (c.ok) {
        setConnections(c.data.connections);
        setConnectionId(c.data.connections[0]?.id || "");
      }
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const chips: Array<{ id: MimeChip; label: string }> = [
    { id: "", label: "All types" },
    { id: "doc", label: "Docs" },
    { id: "sheet", label: "Sheets" },
    { id: "slides", label: "Slides" },
    { id: "other", label: "Other" },
  ];

  const displayFiles =
    mimeChip === "other" ? files.filter((f) => mimeFamily(f.mimeType) === "other") : files;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${fieldClass} max-w-xs`}
          placeholder="Search title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") reload();
          }}
        />
        <select
          className={`${fieldClass} max-w-[10rem]`}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value as typeof entityFilter)}
        >
          <option value="">All entities</option>
          <option value="event">Events</option>
          <option value="team">Teams</option>
          <option value="club">Clubs</option>
          <option value="booking">Bookings</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={addedByMe}
            onChange={(e) => setAddedByMe(e.target.checked)}
          />
          Added by me
        </label>
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-1.5 text-xs"
          onClick={() => reload()}
        >
          Search
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id || "all"}
            type="button"
            className={`rounded-lg border px-2.5 py-1 text-xs ${
              mimeChip === c.id
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-soft hover:text-ink"
            }`}
            onClick={() => setMimeChip(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!connections.length ? (
        <NeedsConnection
          capability="drive.files"
          ownerId={organizerId}
          message="Connect Google Drive to use the Library"
        />
      ) : (
        <div className="space-y-3 rounded-xl border border-line px-3 py-3">
          <p className="text-xs text-ink-soft">
            To attach a file to a specific event, team, club or booking, open that page&apos;s Files
            section. Below you can create a personal scratch file linked to your organizer id.
          </p>
          <label className="block text-xs">
            Drive account
            <select
              className="mt-1 w-full max-w-sm rounded border border-line bg-paper px-2 py-1.5 text-sm"
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
          <div className="flex flex-wrap gap-4">
            <FilePickerButton
              connectionId={connectionId}
              entityType="event"
              entityId={organizerId}
              onLinked={reload}
            />
            <CreateDriveFileMenu
              connectionId={connectionId}
              entityType="event"
              entityId={organizerId}
              onCreated={reload}
            />
          </div>
        </div>
      )}

      {pending && !displayFiles.length ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <LibraryList files={displayFiles} onChanged={reload} />
          {nextCursor ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50"
              onClick={() => loadPage(nextCursor, true)}
            >
              Load more
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
