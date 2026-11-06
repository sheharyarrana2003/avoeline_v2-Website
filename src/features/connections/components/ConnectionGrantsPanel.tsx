"use client";

import { useEffect, useState, useTransition } from "react";
import type { ConnectionCapability, ConnectionPublic } from "../types";
import {
  grantUseAction,
  listEligibleMembersAction,
  listGrantsAction,
  revokeUseAction,
} from "../actions/grants.action";

type Grant = {
  id: string;
  userId: string;
  capabilities: ConnectionCapability[];
  userName?: string | null;
  userEmail?: string | null;
};

export function ConnectionGrantsPanel({
  connection,
  orgId,
}: {
  connection: ConnectionPublic;
  orgId: string;
}) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [members, setMembers] = useState<Array<{ userId: string; name: string; email: string }>>(
    [],
  );
  const [userId, setUserId] = useState("");
  const [caps, setCaps] = useState<ConnectionCapability[]>(["email.send"]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reload() {
    start(async () => {
      const [g, m] = await Promise.all([
        listGrantsAction({ connectionId: connection.id }),
        listEligibleMembersAction({ orgId }),
      ]);
      if (g.ok) setGrants(g.data.grants as Grant[]);
      if (m.ok) setMembers(m.data.members);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id, orgId]);

  if (connection.ownerType !== "org") return null;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line bg-canvas/40 px-3 py-3 text-sm">
      <p className="font-medium text-ink">Who can use this connection</p>
      {message ? <p className="text-xs text-ink-soft">{message}</p> : null}
      <ul className="space-y-1 text-xs text-ink-soft">
        {grants.length === 0 ? <li>No grants yet.</li> : null}
        {grants.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {g.userName || g.userEmail || g.userId} · {g.capabilities.join(", ")}
            </span>
            <button
              type="button"
              disabled={pending}
              className="rounded border border-line px-2 py-0.5 text-[11px]"
              onClick={() =>
                start(async () => {
                  const r = await revokeUseAction({ grantId: g.id });
                  setMessage(r.ok ? "Revoked." : r.error.message);
                  reload();
                })
              }
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-xs">
          Member
          <select
            className="mt-1 block w-48 rounded border border-line bg-paper px-2 py-1"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select…</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name || m.email || m.userId}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={caps.includes("email.send")}
            onChange={(e) => setCaps(e.target.checked ? ["email.send"] : [])}
          />
          email.send
        </label>
        <button
          type="button"
          disabled={pending || !userId || !caps.length}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
          onClick={() =>
            start(async () => {
              const r = await grantUseAction({
                connectionId: connection.id,
                userId,
                capabilities: caps,
              });
              setMessage(r.ok ? "Granted." : r.error.message);
              reload();
            })
          }
        >
          Grant use
        </button>
      </div>
    </div>
  );
}
