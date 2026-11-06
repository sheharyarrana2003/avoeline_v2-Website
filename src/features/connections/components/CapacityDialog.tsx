"use client";

import { useMemo, useState, useTransition } from "react";
import type { PreviewSendResult } from "../types";
import { confirmSendAction } from "../actions/send.action";

type Mode = "send_and_schedule" | "selection_cap" | "spread_days" | "cancel";

export function CapacityDialog({
  open,
  onClose,
  ownerId,
  kind,
  subject,
  html,
  text,
  eventId,
  recipients,
  preview,
  onSelectionCap,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  kind: string;
  subject: string;
  html?: string;
  text?: string;
  eventId?: string;
  recipients: Array<{ email: string; registrationId?: string | null }>;
  preview: PreviewSendResult;
  onSelectionCap?: (cap: number) => void;
  onDone?: (result: { batchId?: string; sentNow?: number }) => void;
}) {
  const [mode, setMode] = useState<Mode>("send_and_schedule");
  const [spreadDays, setSpreadDays] = useState(3);
  const [startLocal, setStartLocal] = useState(() => {
    const iso = preview.schedule[0]?.notBefore || preview.capacity.nextFreeAt;
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const monthlyBlocked = Boolean(
    preview.capacity.planMonthlyRemaining <= 0 ||
    preview.blockedReason?.toLowerCase().includes("month"),
  );

  const scheduleSummary = useMemo(() => {
    if (!preview.schedule.length) return "Nothing to schedule.";
    return preview.schedule
      .map((c) => `${c.count} at ${new Date(c.notBefore).toLocaleString()}`)
      .join("; ");
  }, [preview.schedule]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capacity-dialog-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-paper p-5 shadow-lg">
        <h2 id="capacity-dialog-title" className="font-display text-lg text-ink">
          Send capacity
        </h2>

        {monthlyBlocked ? (
          <div className="mt-3 space-y-3 text-sm text-ink">
            <p>
              Your plan allows {preview.capacity.planMonthlyCap} emails a month; it resets on{" "}
              {new Date(preview.capacity.nextMonthResetAt).toLocaleDateString()}.
            </p>
            <p className="text-ink-soft">
              You can schedule from the reset date, or upgrade your plan.
            </p>
            <label className="block text-xs font-medium">
              Start time (local)
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-ink">
            <p>
              You can send <strong>{preview.sendNow}</strong> more emails today from{" "}
              {preview.capacity.providerEmail}. You selected <strong>{preview.total}</strong>.
            </p>
            <fieldset className="space-y-2">
              <label className="flex gap-2">
                <input
                  type="radio"
                  name="cap-mode"
                  checked={mode === "send_and_schedule"}
                  onChange={() => setMode("send_and_schedule")}
                />
                <span>
                  Send {preview.sendNow} now, schedule the rest
                  <span className="mt-1 block text-xs text-ink-soft">{scheduleSummary}</span>
                </span>
              </label>
              <label className="flex gap-2">
                <input
                  type="radio"
                  name="cap-mode"
                  checked={mode === "selection_cap"}
                  onChange={() => setMode("selection_cap")}
                />
                <span>Choose recipients (max {preview.sendNow})</span>
              </label>
              <label className="flex gap-2 items-start">
                <input
                  type="radio"
                  name="cap-mode"
                  checked={mode === "spread_days"}
                  onChange={() => setMode("spread_days")}
                  className="mt-1"
                />
                <span>
                  Spread evenly over{" "}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={spreadDays}
                    onChange={(e) => setSpreadDays(Number(e.target.value) || 1)}
                    className="mx-1 w-14 rounded border border-line px-1 py-0.5 text-xs"
                  />{" "}
                  days
                </span>
              </label>
              <label className="flex gap-2">
                <input
                  type="radio"
                  name="cap-mode"
                  checked={mode === "cancel"}
                  onChange={() => setMode("cancel")}
                />
                <span>Cancel</span>
              </label>
            </fieldset>
            {(mode === "send_and_schedule" || mode === "spread_days" || monthlyBlocked) && (
              <label className="block text-xs font-medium">
                Start time (local)
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </label>
            )}
            <p className="text-xs text-ink-faint">
              Tip: connecting a Google Workspace account raises your daily limit. Bounces are not
              visible with send-only Gmail permission — check Sent/Inbox for failures.
            </p>
          </div>
        )}

        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-1.5 text-sm"
            onClick={onClose}
            disabled={pending}
          >
            Close
          </button>
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
            onClick={() =>
              start(async () => {
                setError(null);
                if (mode === "cancel") {
                  onClose();
                  return;
                }
                if (mode === "selection_cap") {
                  onSelectionCap?.(preview.sendNow);
                  onClose();
                  return;
                }
                const startAt = startLocal ? new Date(startLocal).toISOString() : undefined;
                const r = await confirmSendAction({
                  ownerId,
                  kind,
                  subject,
                  html,
                  text,
                  eventId,
                  recipients,
                  mode: monthlyBlocked ? "spread_days" : mode,
                  spreadDays,
                  startAt,
                });
                if (!r.ok) {
                  setError(r.error.message);
                  return;
                }
                onDone?.(r.data as { batchId?: string; sentNow?: number });
                onClose();
              })
            }
          >
            {mode === "cancel" ? "Dismiss" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
