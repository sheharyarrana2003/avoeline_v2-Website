/**
 * One ratio against a limit — seats sold against capacity, mostly.
 *
 * A meter rather than a chart, and rather than the bare "340 / 500" the product
 * printed everywhere: the pair of numbers makes you do the division, and the whole
 * question a capacity figure is asked is "how full is it". The bar answers that
 * before you read either number.
 *
 * Server Component, no dependency, no client boundary.
 *
 * The fill is the accent because "how far along" is state, which is what this
 * product spends its accent on. It is NOT a status colour: a full event is not a
 * success and an empty one is not a failure, so green/amber/red would be editorial.
 */
export function Meter({
    value,
    max,
    label,
    caption,
    className = "",
}: {
    value: number;
    max: number;
    /** Accessible name. Rendered visibly unless `hideLabel` is implied by omitting caption. */
    label: string;
    /** Optional line under the bar, e.g. "340 of 500 seats". */
    caption?: string;
    className?: string;
}) {
    // A zero or missing capacity must not produce Infinity or NaN width.
    const safeMax = max > 0 ? max : 0;
    const percent = safeMax === 0 ? 0 : Math.min(100, Math.round((value / safeMax) * 100));

    return (
        <div className={className}>
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-2xs font-medium uppercase text-ink-soft">{label}</span>
                <span className="text-sm font-medium text-ink tabular-nums">
                    {safeMax === 0 ? "—" : `${percent}%`}
                </span>
            </div>

            <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={safeMax}
                aria-label={label}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted-strong"
            >
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
            </div>

            {caption ? <p className="mt-2 text-xs text-ink-soft">{caption}</p> : null}
        </div>
    );
}
