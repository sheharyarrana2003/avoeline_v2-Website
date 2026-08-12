"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';

import { DailyRegistrationTrend } from "@/src/features/dashboard/types";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

// Recharts wants literal SVG paint values, so the tokens come through as var()
// references — supported on SVG presentation attributes, and it keeps the chart on
// the same ramp as everything around it instead of a second set of hardcoded hex.
const AXIS = { fontSize: 12, fill: 'var(--ink-soft)' } as const;

export default function RegistrationTrendChart({ data }: { data: DailyRegistrationTrend[] }) {
  return (
    // Uncarded, matching TodaysSchedule and RecentRegistrations beside it.
    <section className="font-sans">
      <h2 className="mb-5 border-b border-line pb-3 font-display text-xl text-ink">
        Registration trend
      </h2>

      {data.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<TrendingUp className="h-5 w-5" />}
          title="No registration history yet"
          description="Once attendees start signing up, their daily totals plot here."
        />
      ) : (
        // The Legend is gone: it labelled a single series, so it spent a whole row
        // repeating the section heading.
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="day" padding={{ left: 30, right: 30 }} tick={AXIS} stroke="var(--line-loud)" />
              <YAxis allowDecimals={false} tick={AXIS} stroke="var(--line-loud)" />
              <Tooltip
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid var(--line)',
                  background: 'var(--paper)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--ink-soft)' }}
              />
              <Line
                type="monotone"
                dataKey="registrations"
                name="Registrations"
                stroke="var(--ink)"
                activeDot={{ r: 6 }}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
