import type { ReactNode } from "react";

// Optional so tsc flags every stat grid still to be pointed at this component.
export function StatCard_dashboard({ title, value, icon }: { title: string; value: string; icon?: ReactNode }) {
  return (
    // Cells of one panel rather than four free-floating tiles: the hairlines between
    // them come from the container, so the group reads as a single instrument.
    <div className="border-line p-5 not-last:border-r sm:p-6">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase text-ink-soft">
        {/* gray-400 is 2.5:1 — decoration only, so the label carries all the meaning. */}
        {icon ? <span className="text-ink-faint" aria-hidden="true">{icon}</span> : null}
        {title}
      </p>
      <p className="figure mt-3 text-4xl text-ink">{value}</p>
    </div>
  );
}
