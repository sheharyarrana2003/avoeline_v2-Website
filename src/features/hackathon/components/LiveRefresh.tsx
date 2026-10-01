"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Keep a server-rendered page current while it is being watched.
 *
 * Spec 3.3 wants the leaderboard to update "as scores are submitted". This app
 * has no websockets, no SSE and no realtime listener -- `data/db.ts`, the client
 * Firestore SDK, is legacy and only the auth service may use it -- so the honest
 * mechanism is to re-fetch on a timer. `router.refresh()` re-runs the Server
 * Component and swaps the markup without losing scroll position or client state.
 *
 * The one existing precedent for polling in this repo is
 * `shared_components/auth/EmailVerificationStep.tsx`, which pairs an interval
 * with a focus listener; this follows the same shape. It also stops while the
 * tab is hidden, because a leaderboard left open on a second monitor overnight
 * should not keep asking.
 */
export function LiveRefresh({
    seconds = 15,
    label = "Updating live",
}: {
    seconds?: number;
    label?: string;
}) {
    const router = useRouter();
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const every = Math.max(5, seconds) * 1000;

        const tick = () => {
            if (document.visibilityState === "visible") router.refresh();
        };
        const id = setInterval(tick, every);

        // Coming back to the tab should not mean waiting out the interval.
        const onVisible = () => {
            const hidden = document.visibilityState !== "visible";
            setPaused(hidden);
            if (!hidden) router.refresh();
        };
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);

        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
        };
    }, [router, seconds]);

    return (
        <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-wide text-ink-soft">
            <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${paused ? "bg-ink-faint" : "animate-pulse bg-success"}`}
            />
            {paused ? "Paused" : label}
        </span>
    );
}
