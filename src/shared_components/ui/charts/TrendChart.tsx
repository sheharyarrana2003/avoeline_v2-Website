"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

/**
 * The one time-series chart.
 *
 * The product had two charting approaches: this one (recharts, on the dashboard) and
 * a hand-drawn `<svg viewBox="0 0 720 280">` polyline on the analytics page with no
 * y-axis, no tooltip and no empty state. Two charts, two behaviours, in a product
 * with only two charts total.
 *
 * Colours come through as `var(--series-N)`, which works because SVG presentation
 * attributes accept custom properties and because those tokens live in `:root`
 * rather than only in `@theme` (Tailwind v4 tree-shakes unused `@theme` vars). That
 * is also what makes the chart follow dark mode for free.
 *
 * Series are capped at three by the palette: no fourth hue clears the CVD and
 * normal-vision gates against these three, and a generated hue is indistinguishable
 * under colour-blind simulation. A fourth series folds into "Other" or the chart
 * becomes small multiples.
 */

const SERIES_TOKENS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"] as const;

const AXIS = { fontSize: 12, fill: "var(--ink-soft)" } as const;

const TOOLTIP_STYLE = {
    borderRadius: "0.75rem",
    border: "1px solid var(--line)",
    background: "var(--paper)",
    fontSize: 12,
} as const;

export interface TrendSeries {
    /** Key into each data row. */
    key: string;
    /** Shown in the legend and tooltip. */
    label: string;
}

export default function TrendChart({
    data,
    xKey,
    series,
    height = 280,
    variant = "line",
    allowDecimals = false,
}: {
    data: Record<string, unknown>[];
    xKey: string;
    series: TrendSeries[];
    height?: number;
    /** "area" for a single series where the magnitude matters; "line" otherwise. */
    variant?: "line" | "area";
    allowDecimals?: boolean;
}) {
    const capped = series.slice(0, SERIES_TOKENS.length);

    // A legend for one series spends a whole row repeating the heading above it.
    // For two or more it is mandatory: identity must never be carried by colour alone.
    const showLegend = capped.length > 1;

    const Chart = variant === "area" ? AreaChart : LineChart;

    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <Chart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    {/* Recessive grid: horizontal only. Vertical rules on a time axis
                        add ink without adding a reading the axis ticks don't give. */}
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey={xKey} tick={AXIS} stroke="var(--line-loud)" tickLine={false} />
                    <YAxis allowDecimals={allowDecimals} tick={AXIS} stroke="var(--line-loud)" tickLine={false} width={44} />
                    <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
                        itemStyle={{ color: "var(--ink-soft)" }}
                        cursor={{ stroke: "var(--line-loud)", strokeWidth: 1 }}
                    />
                    {showLegend ? (
                        <Legend
                            verticalAlign="top"
                            align="left"
                            height={28}
                            iconType="plainline"
                            wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }}
                        />
                    ) : null}

                    {capped.map((s, i) =>
                        variant === "area" ? (
                            <Area
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.label}
                                stroke={SERIES_TOKENS[i]}
                                fill={SERIES_TOKENS[i]}
                                fillOpacity={0.12}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        ) : (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.label}
                                stroke={SERIES_TOKENS[i]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        )
                    )}
                </Chart>
            </ResponsiveContainer>
        </div>
    );
}
