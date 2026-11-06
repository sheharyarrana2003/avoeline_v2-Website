"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { listLinkedFilesAction, listMyDriveConnectionsAction } from "../actions/drive.action";
import type { ConnectionOwnerType, LinkedFileEntityType, LinkedFilePublic } from "../types";
import { CreateDriveFileMenu } from "./CreateDriveFileMenu";
import { FilePickerButton } from "./FilePickerButton";
import { LibraryList } from "./LibraryList";
import { NeedsConnection } from "./NeedsConnection";
import { fieldClass } from "@/src/lib/ui";

export function EntityFilesPanel({
  ownerType,
  ownerId,
  entityType,
  entityId,
  connectionsHrefOwnerId,
}: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  entityType: LinkedFileEntityType;
  entityId: string;
  /** Used for NeedsConnection link (organizer user id). */
  connectionsHrefOwnerId: string;
}) {
  const [connections, setConnections] = useState<Array<{ id: string; email: string }>>([]);
  const [connectionId, setConnectionId] = useState("");
  const [files, setFiles] = useState<LinkedFilePublic[]>([]);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  const reloadFiles = useCallback(() => {
    start(async () => {
      const list = await listLinkedFilesAction({
        ownerType,
        ownerId,
        entityType,
        entityId,
        q: q || undefined,
        limit: 50,
      });
      if (list.ok) setFiles(list.data.files);
    });
  }, [ownerType, ownerId, entityType, entityId, q]);

  useEffect(() => {
    start(async () => {
      const c = await listMyDriveConnectionsAction({});
      if (c.ok) {
        setConnections(c.data.connections);
        setConnectionId((prev) => prev || c.data.connections[0]?.id || "");
      }
    });
  }, []);

  useEffect(() => {
    reloadFiles();
  }, [reloadFiles]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Files</h2>
          <p className="text-sm text-ink-soft">
            Link Docs, Sheets and Slides from Google Drive. We never read file contents.
          </p>
        </div>
        <input
          className={`${fieldClass} max-w-xs`}
          placeholder="Search title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => reloadFiles()}
        />
      </div>

      {!connections.length ? (
        <NeedsConnection
          capability="drive.files"
          ownerId={connectionsHrefOwnerId}
          message="Connect Google Drive to attach or create files"
        />
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-canvas/30 px-3 py-3">
          <label className="block text-xs text-ink">
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
          <div className="flex flex-wrap items-start gap-4">
            <FilePickerButton
              connectionId={connectionId}
              entityType={entityType}
              entityId={entityId}
              onLinked={reloadFiles}
            />
            <CreateDriveFileMenu
              connectionId={connectionId}
              entityType={entityType}
              entityId={entityId}
              onCreated={reloadFiles}
            />
          </div>
        </div>
      )}

      {pending && !files.length ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <LibraryList files={files} onChanged={reloadFiles} />
      )}
    </section>
  );
}
