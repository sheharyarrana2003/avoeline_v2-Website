"use client";

import { useState, useTransition } from "react";
import { unlinkFileAction, verifyLinkedFileAction } from "../actions/drive.action";
import { gateOpenAfterVerify, mimeLabel } from "../lib/linkedFiles.logic";
import type { LinkedFilePublic, LinkedFileStatus } from "../types";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";

export function LibraryList({
  files,
  onChanged,
}: {
  files: LinkedFilePublic[];
  onChanged?: () => void;
}) {
  const [pending, start] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);

  if (!files.length) {
    return (
      <EmptyState
        title="No files yet"
        description="Pick a file from Google Drive or create a Doc, Sheet, or Slides."
      />
    );
  }

  function openInGoogle(f: LinkedFilePublic) {
    setBanner(null);
    start(async () => {
      const r = await verifyLinkedFileAction({ linkedFileId: f.id });
      if (!r.ok) {
        setBanner(r.error.message);
        onChanged?.();
        return;
      }
      const gate = gateOpenAfterVerify(r.data.status as LinkedFileStatus);
      if (!gate.allow) {
        setBanner(gate.reason);
        onChanged?.();
        return;
      }
      if (f.webUrl) window.open(f.webUrl, "_blank", "noopener,noreferrer");
      onChanged?.();
    });
  }

  return (
    <div className="space-y-2">
      {banner ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {banner}
        </p>
      ) : null}
      <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
        {files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex items-center gap-3">
              {f.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.iconUrl} alt="" className="h-5 w-5 shrink-0" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-2xs">
                  {mimeLabel(f.mimeType).slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{f.title}</p>
                <p className="text-xs text-ink-soft">
                  {mimeLabel(f.mimeType)} · {f.entityType}
                  {f.addedByName ? ` · ${f.addedByName}` : ""}
                  {f.providerModifiedAt
                    ? ` · modified ${new Date(f.providerModifiedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={f.status} size="sm" />
              {f.webUrl ? (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs font-medium underline disabled:opacity-50"
                  onClick={() => openInGoogle(f)}
                >
                  Open in Google
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                className="text-xs text-ink-soft hover:text-ink disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    await verifyLinkedFileAction({ linkedFileId: f.id });
                    onChanged?.();
                  })
                }
              >
                Check access
              </button>
              <button
                type="button"
                disabled={pending}
                className="text-xs text-danger hover:underline disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await unlinkFileAction({ linkedFileId: f.id });
                    if (r.ok) onChanged?.();
                  })
                }
              >
                Unlink
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
