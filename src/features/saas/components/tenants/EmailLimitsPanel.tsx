"use client";

import { useState, useTransition } from "react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import {
  getOrganizerEmailUsageAction,
  pauseOrganizerSendingAction,
  upsertEmailLimitOverrideAction,
} from "@/src/features/connections/actions/adminLimits.action";

export function EmailLimitsPanel({ ownerId, canManage }: { ownerId: string; canManage: boolean }) {
  const [dailyCap, setDailyCap] = useState("");
  const [monthlyCap, setMonthlyCap] = useState("");
  const [maxPerSend, setMaxPerSend] = useState("");
  const [reason, setReason] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [usage, setUsage] = useState<{
    sentLast24h: number;
    connections: Array<{
      id: string;
      provider_email: string | null;
      status: string;
      quota_exhausted_until: string | null;
      sending_paused_until: string | null;
    }>;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Plan email caps, per-organizer overrides, and temporary send pauses (docs/18).
      </p>
      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await getOrganizerEmailUsageAction({ ownerId });
            if (!r.ok) {
              setMessage(r.error.message);
              return;
            }
            setUsage(r.data as typeof usage);
            setMessage(null);
          })
        }
      >
        Load usage
      </button>

      {usage ? (
        <div className="rounded-xl border border-line bg-muted/30 px-3 py-2 text-xs text-ink-soft">
          <p>
            Sent last 24h: <strong className="text-ink">{usage.sentLast24h}</strong>
          </p>
          <ul className="mt-1 space-y-0.5">
            {usage.connections.map((c) => (
              <li key={c.id}>
                {c.provider_email || c.id} · {c.status}
                {c.sending_paused_until
                  ? ` · paused until ${new Date(c.sending_paused_until).toLocaleString()}`
                  : ""}
                {c.quota_exhausted_until
                  ? ` · exhausted until ${new Date(c.quota_exhausted_until).toLocaleString()}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <>
          <fieldset className="space-y-2">
            <legend className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
              Override limits
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                <span className={labelClass}>Daily</span>
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  min={1}
                  value={dailyCap}
                  onChange={(e) => setDailyCap(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className={labelClass}>Monthly</span>
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  min={1}
                  value={monthlyCap}
                  onChange={(e) => setMonthlyCap(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className={labelClass}>Max / send</span>
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  min={1}
                  max={5000}
                  value={maxPerSend}
                  onChange={(e) => setMaxPerSend(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className={labelClass}>Reason</span>
              <input
                className={`${fieldClass} mt-1`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </label>
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={pending || reason.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const r = await upsertEmailLimitOverrideAction({
                    ownerId,
                    dailyCap: dailyCap ? Number(dailyCap) : undefined,
                    monthlyCap: monthlyCap ? Number(monthlyCap) : undefined,
                    maxPerSend: maxPerSend ? Number(maxPerSend) : undefined,
                    reason: reason.trim(),
                  });
                  setMessage(r.ok ? "Override saved." : r.error.message);
                })
              }
            >
              Save override
            </button>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
              Pause sending
            </legend>
            <label className="block text-xs">
              <span className={labelClass}>Reason</span>
              <input
                className={`${fieldClass} mt-1`}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={buttonClass("destructive", "sm")}
              disabled={pending || pauseReason.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const r = await pauseOrganizerSendingAction({
                    ownerId,
                    reason: pauseReason.trim(),
                  });
                  setMessage(r.ok ? "Sending paused for 24h." : r.error.message);
                })
              }
            >
              Pause 24h
            </button>
          </fieldset>
        </>
      ) : null}
    </div>
  );
}
