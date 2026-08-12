import type { ReactNode } from "react";

// Optional so tsc flags every stat grid still to be pointed at this component.
export function StatCard_dashboard({ title, value, icon }: { title: string; value: string; icon?: ReactNode }) {
  return (
    <div className="px-0 sm:px-6 sm:first:pl-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-ink-soft">
        {/* gray-400 is 2.5:1 — decoration only, so the label carries all the meaning. */}
        {icon ? <span className="text-gray-400" aria-hidden="true">{icon}</span> : null}
        {title}
      </p>
      <p className="mt-2 font-display text-4xl text-ink tabular-nums">{value}</p>
    </div>
  );
}
