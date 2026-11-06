"use client";

import { useState, useTransition } from "react";
import type { ConnectionPublic } from "../types";
import {
  createReconnectLinkAction,
  setTenantKillSwitchAction,
} from "../actions/connections.action";

export function AdminConnectionStatus({
  organizerId,
  connections,
  orgId,
}: {
  organizerId: string;
  connections: ConnectionPublic[];
  /** When set, kill switch toggles organizations.connections_google_disabled */
  orgId?: string | null;
}) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const primary = connections.find((c) => c.status === "active") || connections[0] || null;

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-display text-lg text-ink">Connections</h2>
      <p className="text-sm text-ink-soft">Read-only status for support. Tokens are never shown.</p>
      {connections.length ? (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm">
              <p className="font-medium text-ink">{c.providerEmail}</p>
              <p className="mt-1 text-ink-soft">
                Status: {c.status}
                {c.capabilities.length
                  ? ` · ${c.capabilities
                      .filter((cap) => cap.enabled)
                      .map((cap) => cap.capability)
                      .join(", ")}`
                  : null}
              </p>
              {c.lastUsedAt ? (
                <p className="mt-1 text-xs text-ink-soft">
                  Last used {new Date(c.lastUsedAt).toLocaleString()}
                </p>
              ) : null}
              {c.lastError ? <p className="mt-1 text-xs text-red-700">{c.lastError}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No Google connection.</p>
      )}
      <button
        type="button"
        disabled={pending}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
        onClick={() =>
          start(async () => {
            const r = await createReconnectLinkAction({
              ownerType: orgId ? "org" : "user",
              ownerId: orgId || organizerId,
              organizerId,
              returnPath: orgId ? `/department/settings/connections?reconnect=1` : undefined,
            });
            if (r.ok) {
              setError(null);
              setLink(r.data.path);
            } else {
              setLink(null);
              setError(r.error.message);
            }
          })
        }
      >
        Send reconnect link
      </button>
      {link ? (
        <p className="break-all text-xs text-ink-soft">
          One-time path (copy into a support email): <code>{link}</code>
        </p>
      ) : null}

      <fieldset className="space-y-2 border-t border-line pt-3">
        <legend className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
          Kill switch
        </legend>
        <input
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          placeholder="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || reason.trim().length < 3}
            className="rounded-lg border border-ink px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            onClick={() =>
              start(async () => {
                const r = await setTenantKillSwitchAction({
                  mode: orgId ? "org_flag" : "disable_user_connections",
                  orgId: orgId || undefined,
                  organizerId,
                  disabled: true,
                  reason: reason.trim(),
                });
                setMessage(r.ok ? "Integration disabled." : r.error.message);
              })
            }
          >
            Disable Google
          </button>
          <button
            type="button"
            disabled={pending || reason.trim().length < 3}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            onClick={() =>
              start(async () => {
                const r = await setTenantKillSwitchAction({
                  mode: orgId ? "org_flag" : "disable_user_connections",
                  orgId: orgId || undefined,
                  organizerId,
                  disabled: false,
                  reason: reason.trim(),
                });
                setMessage(r.ok ? "Kill switch cleared." : r.error.message);
              })
            }
          >
            Clear kill switch
          </button>
        </div>
      </fieldset>

      {message ? <p className="text-xs text-ink-soft">{message}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {!primary ? null : null}
    </section>
  );
}
