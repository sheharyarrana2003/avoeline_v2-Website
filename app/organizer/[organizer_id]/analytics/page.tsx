import { AnalyticsService } from "@/src/services/anaylService";
import { analyzeOrganizerFeedback } from "@/src/features/analytics/feedbackAnalysis.service";
import { CalendarDays, LineChart, Smile, TrendingUp, Wallet } from "lucide-react";
import EventFeedbackAnalysis from "./EventFeedbackAnalysis";
import { formatCurrencyCompact } from "@/src/lib/money";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { Breadcrumbs } from "@/src/shared_components/ui/Breadcrumbs";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import TrendChart from "@/src/shared_components/ui/charts/TrendChart.lazy";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import type { AnalyticsEventPerformance } from "@/src/services/models/feedback.model";

// buildChartPoints is gone. It hand-computed a polyline into a fixed 720x280
// viewBox — min-max normalised, so the y-axis started at the smallest value and
// every series looked equally dramatic — with no axis, no tooltip and no way to
// read a value off it. The product had exactly two charts and this was the second
// one, built a completely different way from the first. Both are TrendChart now.

// profit and avgSatisfaction were computed for every row and the table showed four
// of the eight fields it was handed.
const performanceColumns: Column<AnalyticsEventPerformance>[] = [
    {
        key: "event",
        header: "Event",
        cell: (e) => <CellStack primary={e.eventName} secondary={e.eventType} />,
    },
    {
        key: "date",
        header: "Date",
        cell: (e) => <span className="whitespace-nowrap text-ink-soft tabular-nums">{e.date}</span>,
    },
    {
        key: "registrations",
        header: "Registrations",
        align: "right",
        cell: (e) => e.registrations.toLocaleString("en-US"),
    },
    {
        key: "satisfaction",
        header: "Satisfaction",
        cell: (e) =>
            e.avgSatisfaction > 0 ? (
                <span className="flex items-center gap-1.5">
                    <StarRating rating={e.avgSatisfaction} />
                    <span className="text-xs text-ink-soft tabular-nums">{e.avgSatisfaction.toFixed(1)}</span>
                </span>
            ) : (
                <span className="text-ink-faint">—</span>
            ),
    },
    {
        key: "revenue",
        header: "Revenue",
        align: "right",
        cell: (e) => formatCurrencyCompact(e.revenue),
    },
    {
        key: "profit",
        header: "Profit (est.)",
        align: "right",
        cell: (e) => <span className="text-ink-soft">{formatCurrencyCompact(e.profit)}</span>,
    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ organizer_id: string }>;
}) {
    const { organizer_id } = await params;

    // One events read + one registerations read feed all seven metrics.
    const {
        totalEvents,
        profit,
        totalRevenue,
        avgSatisfaction,
        dailyRegistrations,
        eventPerformance,
        dateRange,
    } = await AnalyticsService.getAnalyticsData(organizer_id);

    const analyzeFeedback = async () => {
        "use server";
        return analyzeOrganizerFeedback(organizer_id);
    };

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <Breadcrumbs
                    items={[{ label: "Dashboard", href: `/organizer/${organizer_id}/dashboard` }, { label: "Analytics" }]}
                />

                <PageHeader
                    title="Analytics Overview"
                    description="Data insights and performance metrics"
                    actions={<p className="text-sm text-ink-soft tabular-nums">{dateRange}</p>}
                />

                {/* Every one of these four `helper` strings — "3 draft, 5 published",
                    "Avg: Rs 12K/event", "Based on N ratings", "Estimated after platform
                    fees" — was already computed by the service and had nowhere to go,
                    because the old tile rendered a title and a value and nothing else.
                    "(Est.)" was crammed into the Profit title for exactly that reason;
                    the caveat now sits where it belongs. */}
                <section className="grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4">
                    <MetricTile label="Total events" value={totalEvents.value} sublabel={totalEvents.helper} icon={<CalendarDays size={14} />} />
                    <MetricTile label="Profit" value={profit.value} sublabel={profit.helper} icon={<TrendingUp size={14} />} />
                    <MetricTile label="Total revenue" value={totalRevenue.value} sublabel={totalRevenue.helper} icon={<Wallet size={14} />} />
                    <MetricTile label="Avg. satisfaction" value={avgSatisfaction.value} sublabel={avgSatisfaction.helper} icon={<Smile size={14} />} />
                </section>

                <Card
                    title="Daily registrations"
                    action={<span className="text-xs text-ink-soft">Last 30 days</span>}
                >
                    <CardBody>
                        {dailyRegistrations.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<LineChart size={24} />}
                                title="No registrations yet"
                                description="This chart fills in as attendees register for your published events."
                            />
                        ) : (
                            <TrendChart
                                data={dailyRegistrations as unknown as Record<string, unknown>[]}
                                xKey="label"
                                variant="area"
                                series={[{ key: "registrations", label: "Registrations" }]}
                                height={300}
                            />
                        )}
                    </CardBody>
                </Card>

                <Card title="Event performance">
                    <DataTable
                        caption="Registrations, revenue and satisfaction per event"
                        rows={eventPerformance}
                        columns={performanceColumns}
                        getKey={(e) => e.id}
                        empty={
                            <div className="p-6">
                                <EmptyState
                                    size="sm"
                                    icon={<CalendarDays size={24} />}
                                    title="No events to measure"
                                    description="Publish an event and its registrations and revenue will be summarised here."
                                />
                            </div>
                        }
                    />
                </Card>

                <EventFeedbackAnalysis analyzeFeedback={analyzeFeedback} />
            </div>
        </div>
    );
}
