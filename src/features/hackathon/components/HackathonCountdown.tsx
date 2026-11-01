"use client";

import { useEffect, useState } from "react";

export function HackathonCountdown({ endsAt, label }: { endsAt: string; label?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return null;
  if (now === null) {
    return (
      <p className="text-sm tabular-nums text-ink" suppressHydrationWarning>
        …
      </p>
    );
  }
  const left = Math.max(0, end - now);
  const ended = left <= 0;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const prefix = label ? `${label}: ` : "";
  return (
    <p className="text-sm tabular-nums text-ink">
      {ended ? `${prefix}Time is up` : `${prefix}${h}h ${m}m ${s}s remaining`}
    </p>
  );
}
