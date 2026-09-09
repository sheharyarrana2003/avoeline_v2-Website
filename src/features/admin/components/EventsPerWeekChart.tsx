import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import TrendChart from "@/src/shared_components/ui/charts/TrendChart.lazy";

/**
 * Spec 9.2's "chart showing new events created per week".
 *
 * A thin wrapper over the shared chart, exactly like
 * `RegistrationTrendChart` — the data is already bucketed by
 * `getPlatformTotals`, and `TrendChart.lazy` carries the client boundary so
 * this stays a Server Component and the empty state renders on the server.
 *
 * "whatever charting library is easiest to integrate", per the spec: recharts
 * is already the one this project has, behind the one wrapper it already has.
 */
export default function EventsPerWeekChart({ data }: { data: { label: string; count: number }[] }) {
    if (data.length === 0) {
        return (
            <EmptyState
                size="sm"
                icon={<TrendingUp className="h-5 w-5" />}
                title="No events created yet"
                description="Once organizers start publishing, their weekly totals plot here."
            />
        );
    }

    return (
        <TrendChart
            data={data as unknown as Record<string, unknown>[]}
            xKey="label"
            variant="area"
            series={[{ key: "count", label: "Events created" }]}
            height={260}
            allowDecimals={false}
        />
    );
}
