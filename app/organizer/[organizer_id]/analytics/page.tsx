import { AnalyticsService } from "@/src/services/anaylService";
import { analyzeOrganizerFeedback } from "@/src/features/analytics/feedbackAnalysis.service";
import { Activity, CalendarDays, Smile, TrendingUp, Wallet } from "lucide-react";
import { DailyAnalyticsRegistration } from "@/src/services/models/feedback.model";
import EventFeedbackAnalysis from "./EventFeedbackAnalysis";
import { formatCurrencyCompact } from "@/src/lib/money";

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

    const metrics = [
        { label: "Total Events", icon: CalendarDays, ...totalEvents },
        { label: "Profit", icon: TrendingUp, ...profit },
        { label: "Total Revenue", icon: Wallet, ...totalRevenue },
        { label: "Avg. Satisfaction", icon: Smile, ...avgSatisfaction },
    ];

    const chartPoints = buildChartPoints(dailyRegistrations);

    const analyzeFeedback = async () => {
        "use server";
        return analyzeOrganizerFeedback(organizer_id);
    };

    return (
        <main className="min-h-screen bg-white px-4 py-8 text-gray-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">

                <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">
                            Analytics Overview
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                            Data insights and performance metrics
                        </p>
                    </div>
                    <p className="text-sm font-bold text-gray-500">{dateRange}</p>
                </header>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <article
                                key={metric.label}
                                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                        {metric.label}
                                    </p>
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                                        <Icon size={18} />
                                    </span>
                                </div>
                                <p className="text-3xl font-extrabold text-gray-950">
                                    {metric.value}
                                </p>
                                {metric.helper && (
                                    <p className="mt-3 text-xs font-bold text-gray-500">
                                        {metric.helper}
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </section>

                {/* ── Daily Registrations Chart ─────────────────────────────── */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-extrabold text-gray-950">
                                Daily Registrations
                            </h2>
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                                Registration volume over the last 30 days
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#171717]">
                            <span className="size-2 rounded-full bg-[#171717]" />
                            Registrations
                        </div>
                    </div>

                    {dailyRegistrations.length === 0 ? (
                        <div className="flex h-[320px] items-center justify-center text-sm font-semibold text-gray-500">
                            No registration data available yet.
                        </div>
                    ) : (
                        <div className="h-[320px] overflow-hidden">
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
                                        stroke="#e5e5e5"
                                        strokeWidth="1"
                                    />
                                ))}
                                <polyline
                                    fill="none"
                                    points={chartPoints}
                                    stroke="#171717"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="5"
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
                                            className="fill-gray-400 text-[13px] font-bold"
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
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 p-6">
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                                <Activity size={18} />
                            </span>
                            <h2 className="text-base font-extrabold text-gray-950">
                                Event Performance
                            </h2>
                        </div>
                    </div>

                    {eventPerformance.length === 0 ? (
                        <div className="flex h-32 items-center justify-center text-sm font-semibold text-gray-500">
                            No events found for this organizer.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] border-collapse">
                                <thead className="bg-gray-50">
                                    <tr className="text-left">
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                            Event Name
                                        </th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                            Registrations
                                        </th>
                                      
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                            Revenue
                                        </th>
                                       
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventPerformance.map((event) => (
                                        <tr
                                            key={event.id}
                                            className="border-t border-gray-100"
                                        >
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-extrabold text-gray-950">
                                                    {event.eventName}
                                                </p>
                                                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                                                    {event.eventType}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-bold text-gray-500">
                                                {event.date}
                                            </td>
                                            <td className="px-6 py-5 text-sm font-extrabold text-gray-950">
                                                {event.registrations.toLocaleString("en-US")}
                                            </td>
                                            <td className="px-6 py-5 text-sm font-extrabold text-gray-950">
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
        </main>
    );
}
