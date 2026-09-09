import dynamic from "next/dynamic";
import { SkeletonList } from "@/src/shared_components/ui/Skeleton";

/**
 * Deferred like the registration chart it mirrors: recharts pulls in several
 * hundred kilobytes of d3, and the dashboard's four summary numbers should not
 * wait for it.
 */
const EventsPerWeekChart = dynamic(() => import("./EventsPerWeekChart"), {
    loading: () => <SkeletonList rows={3} height="h-16" />,
});

export default function EventsPerWeekChartLazy({ data }: { data: { label: string; count: number }[] }) {
    return <EventsPerWeekChart data={data} />;
}
