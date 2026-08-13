import { AnalyticsService } from "@/src/services/anaylService";
import { analyzeOrganizerFeedback } from "@/src/features/analytics/feedbackAnalysis.service";
import { CalendarDays, LineChart, Smile, TrendingUp, Wallet } from "lucide-react";
import { DailyAnalyticsRegistration } from "@/src/services/models/feedback.model";
import EventFeedbackAnalysis from "./EventFeedbackAnalysis";
import { formatCurrencyCompact } from "@/src/lib/money";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";

// ─── Helpers (server-side only) ───────────────────────────────────────────────

function buildChartPoints(data: DailyAnalyticsRegistration[]) {
    const width = 720;
    const height = 240;
    const paddingX = 22;
    const paddingY = 24;
    const max = Math.max(...data.map((item) => item.registrations));
    const min = Math.min(...data.map((item) => item.registrations));
    const spread = Math.max(max - min, 1);

    return data
        .map((item, index) => {
            const x =
                paddingX +
                (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
            const y =
                height -
                paddingY -
                ((item.registrations - min) / spread) * (height - paddingY * 2);
            return `${x},${y}`;
        })
        .join(" ");
}

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

    const chartPoints = buildChartPoints(dailyRegistrations);

    const analyzeFeedback = async () => {
        "use server";
        return analyzeOrganizerFeedback(organizer_id);
    };

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">

                <PageHeader
                    title="Analytics Overview"
                    description="Data insights and performance metrics"
                    actions={<p className="text-sm text-ink-soft tabular-nums">{dateRange}</p>}
                />

                {/* "Est." is in the title because the canonical tile has no sub-label slot,
                    and an estimated profit presented as a measured one would be a lie. */}
                <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                    <StatCard_dashboard title="Total Events" value={totalEvents.value} icon={<CalendarDays size={14} />} />
                    <StatCard_dashboard title="Profit (Est.)" value={profit.value} icon={<TrendingUp size={14} />} />
                    <StatCard_dashboard title="Total Revenue" value={totalRevenue.value} icon={<Wallet size={14} />} />
                    <StatCard_dashboard title="Avg. Satisfaction" value={avgSatisfaction.value} icon={<Smile size={14} />} />
                </section>

                {/* ── Daily Registrations Chart ─────────────────────────────── */}
                <section>
                    <div className="flex flex-col gap-1 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
                        <h2 className="font-display text-xl text-ink">Daily Registrations</h2>
                        <p className="text-sm text-ink-soft">Registration volume over the last 30 days</p>
                    </div>

                    {dailyRegistrations.length === 0 ? (
                        <EmptyState
                            size="sm"
                            className="mt-6"
                            icon={<LineChart size={24} />}
                            title="No registrations yet"
                            description="This chart fills in as attendees register for your published events."
                        />
                    ) : (
                        <div className="mt-6 h-[320px] overflow-hidden">
                            <svg
                                viewBox="0 0 720 280"
                                className="h-full w-full"
                                role="img"
                                aria-label="Daily registrations line chart"
                            >
                                {[56, 112, 168, 224].map((y) => (
                                    <line
                                        key={y}
                                        x1="22"
                                        x2="698"
                                        y1={y}
                                        y2={y}
                                        className="stroke-gray-200"
                                        strokeWidth="1"
                                    />
                                ))}
                                <polyline
                                    fill="none"
                                    points={chartPoints}
                                    className="stroke-accent"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="4"
                                />
                                {dailyRegistrations.map((item, index) => {
                                    const x =
                                        22 +
                                        (index /
                                            Math.max(dailyRegistrations.length - 1, 1)) *
                                        (720 - 44);
                                    return (
                                        <text
                                            key={item.label}
                                            x={x}
                                            y="268"
                                            textAnchor="middle"
                                            /* gray-500 = 4.75:1: an axis label is read, so it clears the body floor. */
                                            className="fill-ink-soft text-2xs"
                                        >
                                            {item.label}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>
                    )}
                </section>

                {/* ── Event Performance Table ───────────────────────────────── */}
                <section>
                    <h2 className="border-b border-line pb-3 font-display text-xl text-ink">
                        Event Performance
                    </h2>

                    {eventPerformance.length === 0 ? (
                        <EmptyState
                            size="sm"
                            className="mt-6"
                            icon={<CalendarDays size={24} />}
                            title="No events to measure"
                            description="Publish an event and its registrations and revenue will be summarised here."
                        />
                    ) : (
                        <div className="mt-2 overflow-x-auto">
                            <table className="w-full min-w-[640px] border-collapse">
                                <thead>
                                    <tr className="border-b border-line">
                                        <th className={tableHead}>Event Name</th>
                                        <th className={tableHead}>Date</th>
                                        <th className={tableHead}>Registrations</th>
                                        <th className={`${tableHead} text-right`}>Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventPerformance.map((event) => (
                                        <tr key={event.id} className={tableRow}>
                                            <td className={tableCell}>
                                                <p className="font-medium text-ink">{event.eventName}</p>
                                                <p className="mt-1 text-2xs uppercase text-ink-soft">
                                                    {event.eventType}
                                                </p>
                                            </td>
                                            <td className={`${tableCell} whitespace-nowrap tabular-nums text-ink-soft`}>
                                                {event.date}
                                            </td>
                                            <td className={`${tableCell} tabular-nums`}>
                                                {event.registrations.toLocaleString("en-US")}
                                            </td>
                                            <td className={`${tableCell} text-right tabular-nums`}>
                                                {formatCurrencyCompact(event.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <EventFeedbackAnalysis analyzeFeedback={analyzeFeedback} />
            </div>
        </div>
    );
}
