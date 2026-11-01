"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart } from "lucide-react";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import type { DailySeriesPoint } from "@/src/features/analytics/analyticsDerive";
import { topEventStackKeys } from "@/src/features/analytics/analyticsDerive";
import { buttonClass } from "@/src/lib/ui";

const STACK_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "#8a8a8a",
  "#b0b0b0",
  "#d0d0d0",
];

const TOOLTIP_STYLE = {
  borderRadius: "0.75rem",
  border: "1px solid var(--line)",
  background: "var(--paper)",
  fontSize: 12,
} as const;

export default function AnalyticsChartPanel({
  series,
  eventTitles,
}: {
  series: DailySeriesPoint[];
  eventTitles: Record<string, string>;
}) {
  const [mode, setMode] = useState<"registrations" | "people">("registrations");
  const titles = useMemo(() => new Map(Object.entries(eventTitles)), [eventTitles]);
  const stackKeys = useMemo(() => topEventStackKeys(series, titles), [series, titles]);

  const data = useMemo(() => {
    return series.map((p) => {
      const row: Record<string, string | number> = {
        label: p.label,
        previous: p.previous,
        people: p.people,
        registrations: p.registrations,
      };
      for (const s of stackKeys) {
        row[s.key] = p.stacks[s.key] ?? 0;
      }
      return row;
    });
  }, [series, stackKeys]);

  const hasAny = series.some((p) => p.registrations > 0 || p.people > 0);

  if (!series.length || !hasAny) {
    return (
      <EmptyState
        size="sm"
        icon={<LineChart size={24} />}
        title="No registrations in this range"
        description="Adjust the date filter or publish an event — the chart fills as people register."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chart metric">
        <button
          type="button"
          className={buttonClass(mode === "registrations" ? "primary" : "secondary", "sm")}
          onClick={() => setMode("registrations")}
        >
          Registrations
        </button>
        <button
          type="button"
          className={buttonClass(mode === "people" ? "primary" : "secondary", "sm")}
          onClick={() => setMode("people")}
        >
          People
        </button>
      </div>

      <div style={{ height: 320 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
              stroke="var(--line-loud)"
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
              stroke="var(--line-loud)"
              tickLine={false}
              width={44}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }}
            />

            {mode === "registrations" ? (
              stackKeys.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="regs"
                  fill={STACK_COLORS[i % STACK_COLORS.length]}
                  maxBarSize={28}
                />
              ))
            ) : (
              <Bar dataKey="people" name="People" fill="var(--series-1)" maxBarSize={28} />
            )}

            <Line
              type="monotone"
              dataKey="previous"
              name="Previous period"
              stroke="var(--ink-soft)"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
