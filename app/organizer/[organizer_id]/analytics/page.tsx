import { AnalyticsService } from "@/src/services/anaylService";
import { AuthService } from "@/src/features/auth/authService";
import { Activity, CalendarDays, Smile, TrendingUp, Wallet } from "lucide-react";

import { DailyAnalyticsRegistration } from "@/src/features/analytics/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
});

function formatCurrency(value: number) {
    if (value >= 1000000) {
        return `PKR ${currencyFormatter.format(value / 1000000)}M`;
    }

    if (value >= 1000) {
        return `PKR ${currencyFormatter.format(value / 1000)}K`;
    }

    return `PKR ${value}`;
}

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
            const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
            const y = height - paddingY - ((item.registrations - min) / spread) * (height - paddingY * 2);

            return `${x},${y}`;
        })
        .join(" ");
}

export default async function AnalyticsPage({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
    const resolvedParams = await params;
    const organizer_id = resolvedParams.organizer_id;
    const [
        totalEvents,
        profit,
        totalRevenue,
        avgSatisfaction,
        dailyRegistrations,
        eventPerformance,
    ] = await Promise.all([
        AnalyticsService.getAnalyticsTotalEvents(organizer_id),
        AnalyticsService.getAnalyticsProfit(organizer_id),
        AnalyticsService.getAnalyticsTotalRevenue(organizer_id),
        AnalyticsService.getAnalyticsAvgSatisfaction(organizer_id),
        AnalyticsService.getAnalyticsDailyRegistrations(organizer_id),
        AnalyticsService.getAnalyticsEventPerformance(organizer_id),
    ]);

    const metrics = [
        { label: "Total Events", icon: CalendarDays, ...totalEvents },
        { label: "Profit", icon: TrendingUp, ...profit },
        { label: "Total Revenue", icon: Wallet, ...totalRevenue },
        { label: "Avg. Satisfaction", icon: Smile, ...avgSatisfaction },
    ];

    const chartPoints = buildChartPoints(dailyRegistrations);

    return (
        <main className="min-h-screen bg-white px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                            Analytics Overview
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Data insights and performance metrics
                        </p>
                    </div>
                    <p className="text-sm font-bold text-slate-500">Mar 1 - Mar 31, 2026</p>
                </header>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => {
                        const Icon = metric.icon;

                        return (
                            <article
                                key={metric.label}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                                        {metric.label}
                                    </p>
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                                        <Icon size={18} />
                                    </span>
                                </div>
                                <p className="text-3xl font-extrabold text-slate-950">{metric.value}</p>
                                {metric.helper && (
                                    <p className="mt-3 text-xs font-bold text-slate-400">{metric.helper}</p>
                                )}
                            </article>
                        );
                    })}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-extrabold text-slate-950">Daily Registrations</h2>
                            <p className="mt-1 text-xs font-semibold text-slate-400">March 2026 registration volume</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#7454f6]">
                            <span className="size-2 rounded-full bg-[#7454f6]" />
                            Registrations
                        </div>
                    </div>

                    <div className="h-[320px] overflow-hidden">
                        <svg viewBox="0 0 720 280" className="h-full w-full" role="img" aria-label="Daily registrations line chart">
                            {[56, 112, 168, 224].map((y) => (
                                <line key={y} x1="22" x2="698" y1={y} y2={y} stroke="#edf0f4" strokeWidth="1" />
                            ))}
                            <polyline
                                fill="none"
                                points={chartPoints}
                                stroke="#7454f6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="5"
                            />
                            {dailyRegistrations.map((item, index) => {
                                const x = 22 + (index / Math.max(dailyRegistrations.length - 1, 1)) * (720 - 44);

                                return (
                                    <text
                                        key={item.label}
                                        x={x}
                                        y="268"
                                        textAnchor="middle"
                                        className="fill-slate-400 text-[13px] font-bold"
                                    >
                                        {item.label}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between border-b border-slate-100 p-6">
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                                <Activity size={18} />
                            </span>
                            <h2 className="text-base font-extrabold text-slate-950">Event Performance</h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] border-collapse">
                            <thead className="bg-slate-50">
                                <tr className="text-left">
                                    <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Event Name</th>
                                    <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Date</th>
                                    <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Registrations</th>
                                    <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Profit</th>
                                    <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Revenue</th>
                                    <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Avg. Satisfaction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventPerformance.map((event) => (
                                    <tr key={event.id} className="border-t border-slate-100">
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-extrabold text-slate-950">{event.eventName}</p>
                                            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                                                {event.eventType}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-slate-500">{event.date}</td>
                                        <td className="px-6 py-5 text-sm font-extrabold text-slate-950">
                                            {event.registrations.toLocaleString("en-US")}
                                        </td>
                                        <td className="px-6 py-5 text-sm font-extrabold text-emerald-600">
                                            {formatCurrency(event.profit)}
                                        </td>
                                        <td className="px-6 py-5 text-sm font-extrabold text-slate-950">
                                            {formatCurrency(event.revenue)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-extrabold text-slate-950">
                                                    {event.avgSatisfaction.toFixed(1)}
                                                </span>
                                                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-[#7454f6]"
                                                        style={{ width: `${(event.avgSatisfaction / 5) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    )
}
