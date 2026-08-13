/**
 * A sparkline, in CSS.
 *
 * Lifted out of the vendor dashboard, where it was a local `MiniBarChart`. Kept as
 * divs rather than moved onto recharts on purpose: seven bars do not justify pulling
 * ~300–400 KB of d3 onto a route, and this renders on the server with no client
 * boundary at all. recharts earns its place only where there are real axes and a
 * tooltip — see TrendChart.
 *
 * `aria-hidden` is not laziness. A sparkline in a stat tile is decoration on top of
 * a figure that is already printed above it in text; announcing seven unlabelled
 * magnitudes to a screen reader adds noise, not information. If a bar chart is ever
 * the ONLY carrier of a number, it needs a table or a label instead of this.
 */
export function MiniBars({
    data,
    className = "",
    emphasis = "max",
}: {
    data: number[];
    className?: string;
    /** Which bar takes the accent: the largest, the most recent, or none. */
    emphasis?: "max" | "last" | "none";
}) {
    if (data.length === 0) return null;

    const max = Math.max(...data, 1);
    const emphasisIndex =
        emphasis === "max" ? data.indexOf(max) : emphasis === "last" ? data.length - 1 : -1;

    return (
        <div className={`flex h-16 items-end gap-1.5 ${className}`} aria-hidden="true">
            {data.map((value, i) => (
                <div
                    key={i}
                    className={`flex-1 rounded-t-xs ${
                        i === emphasisIndex && value > 0 ? "bg-accent" : "bg-muted-strong"
                    }`}
                    // minHeight keeps a zero week visible as a baseline tick rather
                    // than a gap, so the series reads as seven periods either way.
                    style={{ height: `${(value / max) * 100}%`, minHeight: "6px" }}
                />
            ))}
        </div>
    );
}
