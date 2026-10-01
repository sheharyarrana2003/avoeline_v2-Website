import type { ReactNode } from "react";

/**
 * One number, and the context that makes it mean something.
 *
 * This replaces StatCard_dashboard, which rendered a label and a value and nothing
 * else. That is the single biggest reason the dashboards read as bland: a tile
 * carrying one fact cannot answer "is that good?", so a screen of four of them is
 * four numbers floating in white space with no way to interpret any of them.
 *
 * The extra slots are not decoration, they are data the services ALREADY return and
 * the screens were throwing away — the analytics page computes four `helper` strings
 * ("3 draft, 5 published", "Avg: Rs 12K/event") that had nowhere to go, and
 * `vendor.stats` is fetched on four screens and rendered on one.
 *
 *   sublabel  one line under the figure. The "compared to what" line.
 *   facts     a footer row of secondary figures, hairline-separated.
 *   children  anything spatial — a Meter, a MiniBars sparkline.
 *
 * Geometry is unchanged from StatCard_dashboard (a cell of one panel, with the
 * dividing rule coming from the container) so it drops into the existing stat grids
 * without touching their layout.
 */
export function MetricTile({
    label,
    value,
    sublabel,
    icon,
    facts,
    size = "lg",
    className = "",
    children,
}: {
    label: string;
    value: ReactNode;
    sublabel?: ReactNode;
    icon?: ReactNode;
    facts?: { label: string; value: ReactNode }[];
    /** "md" for a dense row of six; "lg" (default) for a headline row of four. */
    size?: "md" | "lg";
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div className={`border-line p-5 not-last:border-b sm:border-b-0 sm:not-last:border-r sm:p-6 ${className}`}>
            <p className="flex items-center gap-1.5 text-2xs font-medium uppercase text-ink-soft">
                {/* ink-faint is 2.5:1 — decoration only, so the label carries all the
                    meaning and the icon is never the sole channel. */}
                {icon ? (
                    <span className="text-ink-faint" aria-hidden="true">
                        {icon}
                    </span>
                ) : null}
                {label}
            </p>

            <p className={`figure mt-3 text-ink ${size === "lg" ? "text-4xl" : "text-3xl"}`}>{value}</p>

            {sublabel ? <p className="mt-2 text-xs text-ink-soft">{sublabel}</p> : null}

            {children ? <div className="mt-4">{children}</div> : null}

            {facts?.length ? (
                // Hairline above rather than a gap: it ties the secondary figures to
                // the headline they qualify, instead of letting them read as three
                // more tiles that happen to be smaller.
                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3">
                    {facts.map((f) => (
                        <div key={f.label} className="min-w-0">
                            <dt className="text-2xs uppercase text-ink-faint">{f.label}</dt>
                            <dd className="text-sm font-medium text-ink tabular-nums">{f.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </div>
    );
}
