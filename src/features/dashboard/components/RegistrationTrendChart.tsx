import { TrendingUp } from "lucide-react";

import { DailyRegistrationTrend } from "@/src/features/dashboard/types";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import TrendChart from "@/src/shared_components/ui/charts/TrendChart.lazy";

/**
 * Registrations per day for the last seven days.
 *
 * Now a thin wrapper over the shared TrendChart rather than its own recharts setup.
 * This file used to be the *only* correctly-built chart in the product while the
 * analytics page hand-drew a polyline in raw SVG — same job, two implementations,
 * one of them with no y-axis and no tooltip.
 *
 * No longer a Client Component itself: TrendChart.lazy carries the boundary, so this
 * stays a Server Component and the heading and empty state render on the server.
 */
export default function RegistrationTrendChart({ data }: { data: DailyRegistrationTrend[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<TrendingUp className="h-5 w-5" />}
        title="No registration history yet"
        description="Once attendees start signing up, their daily totals plot here."
      />
    );
  }

  return (
    // Area rather than a bare line: with one series the magnitude under the curve is
    // the point, and the fill gives the shape weight on a monochrome page.
    <TrendChart
      data={data as unknown as Record<string, unknown>[]}
      xKey="day"
      variant="area"
      series={[{ key: "registrations", label: "Registrations" }]}
      height={260}
    />
  );
}
