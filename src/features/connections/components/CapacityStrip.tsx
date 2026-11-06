"use client";

import { useEffect, useState, useTransition } from "react";
import type { CapacitySnapshot } from "../types";
import { getCapacityAction } from "../actions/send.action";

function formatTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function CapacityStrip({
  ownerId,
  kind = "custom",
  eventId,
  capacity: initial,
}: {
  ownerId: string;
  kind?: string;
  eventId?: string;
  capacity?: CapacitySnapshot | null;
}) {
  const [capacity, setCapacity] = useState<CapacitySnapshot | null>(initial || null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (initial) {
      setCapacity(initial);
      return;
    }
    start(async () => {
      const r = await getCapacityAction({ ownerId, kind, eventId });
      if (r.ok) setCapacity(r.data);
    });
  }, [ownerId, kind, eventId, initial]);

  if (!capacity) {
    return (
      <p className="text-xs text-ink-soft">
        {pending ? "Loading capacity…" : "Capacity unavailable."}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-canvas/40 px-3 py-2 text-xs text-ink-soft">
      <p>
        Today {capacity.usedLast24h} / {capacity.providerDailyLimit} used
        {capacity.nextFreeAt
          ? ` · next slots free up from ${formatTime(capacity.nextFreeAt, capacity.timezone)}`
          : null}
      </p>
      <p className="mt-0.5">
        This month {capacity.planMonthlyCap - capacity.planMonthlyRemaining} /{" "}
        {capacity.planMonthlyCap}
        {capacity.remainingBulk >= 0 ? ` · bulk available now ${capacity.remainingBulk}` : null}
      </p>
      <p className="mt-1 text-[11px] text-ink-faint">
        Bounces are not visible with send-only Gmail permission — check your Sent/Inbox for
        failures.
      </p>
    </div>
  );
}
