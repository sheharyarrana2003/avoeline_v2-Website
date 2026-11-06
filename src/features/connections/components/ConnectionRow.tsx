"use client";

import { useState, useTransition } from "react";
import type { ConnectionPublic } from "../types";
import {
  disconnectConnectionAction,
  setDefaultSenderAction,
  testConnectionAction,
} from "../actions/connections.action";

const STATUS_LABEL: Record<string, string> = {
  active: "Connected",
  needs_reconnect: "Needs reconnect",
  blocked_by_admin: "Blocked by admin",
  disabled: "Disabled",
  revoked: "Revoked",
};

export function ConnectionRow({
  connection,
  ownerId,
  onReconnect,
}: {
  connection: ConnectionPublic;
  ownerId: string;
  onReconnect: () => void;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{connection.providerEmail}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {STATUS_LABEL[connection.status] || connection.status}
            {typeof connection.quotaRemaining === "number"
              ? ` · ${connection.quotaRemaining} sends left today`
              : null}
          </p>
          {connection.lastError ? (
            <p className="mt-1 text-xs text-red-700">{connection.lastError}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {connection.status === "active" ? (
            <>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await testConnectionAction({ connectionId: connection.id });
                    if (r.ok) {
                      setError(null);
                      setMessage("Test email sent.");
                    } else {
                      setMessage(null);
                      setError(r.error.message);
                    }
                  })
                }
              >
                Send test
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await setDefaultSenderAction({
                      ownerId,
                      connectionId: connection.id,
                    });
                    if (r.ok) {
                      setError(null);
                      setMessage("Set as default sender.");
                    } else {
                      setMessage(null);
                      setError(r.error.message);
                    }
                  })
                }
              >
                Set default
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
              onClick={onReconnect}
            >
              Reconnect
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
            onClick={() =>
              start(async () => {
                const r = await disconnectConnectionAction({ connectionId: connection.id });
                if (r.ok) {
                  setError(null);
                  setMessage("Disconnected.");
                } else {
                  setMessage(null);
                  setError(r.error.message);
                }
              })
            }
          >
            Disconnect
          </button>
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
