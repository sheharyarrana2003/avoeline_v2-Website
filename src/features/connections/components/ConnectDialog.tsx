"use client";

import { useState, useTransition } from "react";
import type { IntegrationCatalogEntry } from "../types";
import { PermissionList } from "./PermissionList";
import { startConnectAction } from "../actions/connections.action";
import { formatSafeActionError } from "../lib/connectionUserErrors";

export function ConnectDialog({
  open,
  onClose,
  entry,
  ownerId,
  ownerType = "user",
  loginHint,
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  entry: IntegrationCatalogEntry;
  ownerId: string;
  ownerType?: "user" | "org";
  loginHint?: string;
  returnTo?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-dialog-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-paper p-5 shadow-lg">
        <h2 id="connect-dialog-title" className="font-display text-lg text-ink">
          Connect {entry.name}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{entry.benefit}</p>
        <div className="mt-4">
          <PermissionList allows={entry.allows} never={entry.never} />
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Privacy:{" "}
          <a href="/privacy" className="underline hover:text-ink">
            Privacy policy
          </a>
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !entry.active}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await startConnectAction({
                  ownerId,
                  ownerType,
                  capability: entry.key,
                  returnTo:
                    returnTo ||
                    (typeof window !== "undefined"
                      ? window.location.pathname
                      : `/organizer/${ownerId}/settings/connections`),
                  origin: typeof window !== "undefined" ? window.location.origin : undefined,
                  loginHint,
                });
                if (r.ok && r.data.url) {
                  window.location.href = r.data.url;
                  return;
                }
                if (!r.ok) {
                  setError(formatSafeActionError(r.error));
                }
              })
            }
          >
            {entry.active ? "Continue with Google" : "Coming soon"}
          </button>
        </div>
      </div>
    </div>
  );
}
