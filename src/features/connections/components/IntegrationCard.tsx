"use client";

import { useState } from "react";
import type { ConnectionPublic, IntegrationCatalogEntry } from "../types";
import { ConnectionRow } from "./ConnectionRow";
import { ConnectDialog } from "./ConnectDialog";
import { CalendarPicker } from "./CalendarPicker";

export function IntegrationCard({
  entry,
  connections,
  ownerId,
  ownerType = "user",
  googleReady,
}: {
  entry: IntegrationCatalogEntry;
  connections: ConnectionPublic[];
  ownerId: string;
  ownerType?: "user" | "org";
  googleReady: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const related = connections.filter((c) =>
    c.capabilities.some((cap) => cap.capability === entry.key),
  );
  const active = related.filter((c) => c.status === "active");

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">{entry.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">{entry.benefit}</p>
          {!entry.active ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              Coming in a later release
            </p>
          ) : null}
        </div>
        {entry.active ? (
          <button
            type="button"
            disabled={!googleReady}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
            onClick={() => setDialogOpen(true)}
          >
            {active.length ? "Connect another" : "Connect"}
          </button>
        ) : null}
      </div>

      {entry.active && !googleReady ? (
        <p className="text-xs text-amber-800">
          Google OAuth is not configured on this deployment yet.
        </p>
      ) : null}

      {related.length ? (
        <div className="space-y-2">
          {related.map((c) => (
            <div key={c.id}>
              <ConnectionRow
                connection={c}
                ownerId={ownerId}
                onReconnect={() => setDialogOpen(true)}
              />
              {entry.key === "calendar" && c.status === "active" ? (
                <CalendarPicker connectionId={c.id} />
              ) : null}
            </div>
          ))}
        </div>
      ) : entry.active ? (
        <p className="text-sm text-ink-soft">Not connected.</p>
      ) : null}

      <ConnectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entry={entry}
        ownerId={ownerId}
        ownerType={ownerType}
        returnTo={typeof window !== "undefined" ? window.location.pathname : undefined}
      />
    </section>
  );
}
