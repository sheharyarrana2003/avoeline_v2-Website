"use client";

import type { ReactNode } from "react";

/**
 * Expandable per-competition fee list for the Overview hero (O2).
 * Renders on the dark panel; keep text white/soft for contrast.
 */
export function HackathonFeesHeroFact({
  icon,
  label,
  value,
  lines,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  lines: string[];
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-2xs uppercase tracking-wide text-white/55">{label}</dt>
        <dd className="mt-0.5 truncate text-base font-semibold tabular-nums text-white">{value}</dd>
        {lines.length ? (
          <details className="mt-1 group">
            <summary className="cursor-pointer list-none text-xs text-white/55 underline decoration-white/30 underline-offset-2 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show competitions</span>
              <span className="hidden group-open:inline">Hide competitions</span>
            </summary>
            <ul className="mt-1.5 space-y-1 text-xs tabular-nums text-white/55">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
