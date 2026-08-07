"use client";

import dynamic from "next/dynamic";
import { DailyRegistrationTrend } from "@/src/features/dashboard/types";

// recharts pulls in the d3 scale/shape chain (~300-400 KB). Loading it via
// next/dynamic with ssr:false keeps it out of the dashboard's initial bundle;
// the chart hydrates on the client after first paint.
const RegistrationTrendChart = dynamic(() => import("./RegistrationTrendChart"), {
  ssr: false,
  loading: () => (
    <section className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div
        className="w-full animate-pulse rounded-lg bg-gray-100"
        style={{ height: 400 }}
        aria-label="Loading chart"
      />
    </section>
  ),
});

export default function RegistrationTrendChartLazy({ data }: { data: DailyRegistrationTrend[] }) {
  return <RegistrationTrendChart data={data} />;
}
