"use client";

import { useEffect, useState } from "react";

export function HackathonCountdown({ endsAt }: { endsAt: string }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const end = Date.parse(endsAt);
    if (!Number.isFinite(end)) return null;
    const left = Math.max(0, end - now);
    const ended = left <= 0;
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const s = Math.floor((left % 60_000) / 1000);
    return (
        <p className="text-sm tabular-nums text-ink">
            {ended ? "Time is up" : `${h}h ${m}m ${s}s remaining`}
        </p>
    );
}
