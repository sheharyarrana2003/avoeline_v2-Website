"use client";

import dynamic from "next/dynamic";
import { DailyRegistrationTrend } from "@/src/features/dashboard/types";

// recharts pulls in the d3 scale/shape chain (~300-400 KB). Loading it via
// next/dynamic with ssr:false keeps it out of the dashboard's initial bundle;
// the chart hydrates on the client after first paint.
const RegistrationTrendChart = dynamic(() => import("./RegistrationTrendChart"), {
  ssr: false,
  // Must match the real chart's frame exactly, heading included — a fallback that
  // resolves into a different shape reads as a bug on every navigation.
  loading: () => (
    <section className="font-sans">
      <h2 className="mb-5 border-b border-line pb-3 font-display text-xl text-ink">
        Registration trend
      </h2>
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" aria-label="Loading chart" />
    </section>
  ),
});

export default function RegistrationTrendChartLazy({ data }: { data: DailyRegistrationTrend[] }) {
  return <RegistrationTrendChart data={data} />;
}
