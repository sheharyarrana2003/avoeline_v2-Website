"use client";

import { useState, useTransition } from "react";
import { createDriveFileAction } from "../actions/drive.action";
import type { LinkedFileEntityType } from "../types";

export function CreateDriveFileMenu({
  connectionId,
  entityType,
  entityId,
  onCreated,
}: {
  connectionId: string;
  entityType: LinkedFileEntityType;
  entityId: string;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create(kind: "doc" | "sheet" | "slides") {
    setError(null);
    const name = title.trim() || `Untitled ${kind}`;
    start(async () => {
      const r = await createDriveFileAction({
        connectionId,
        entityType,
        entityId,
        kind,
        title: name,
      });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      setTitle("");
      onCreated?.();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block text-xs text-ink">
        New file title
        <input
          className="mt-1 block w-44 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          maxLength={200}
        />
      </label>
      <button
        type="button"
        disabled={pending || !connectionId}
        className="rounded-lg border border-line px-2 py-1.5 text-xs disabled:opacity-50"
        onClick={() => create("doc")}
      >
        Doc
      </button>
      <button
        type="button"
        disabled={pending || !connectionId}
        className="rounded-lg border border-line px-2 py-1.5 text-xs disabled:opacity-50"
        onClick={() => create("sheet")}
      >
        Sheet
      </button>
      <button
        type="button"
        disabled={pending || !connectionId}
        className="rounded-lg border border-line px-2 py-1.5 text-xs disabled:opacity-50"
        onClick={() => create("slides")}
      >
        Slides
      </button>
      {error ? <p className="basis-full text-xs text-danger">{error}</p> : null}
    </div>
  );
}
