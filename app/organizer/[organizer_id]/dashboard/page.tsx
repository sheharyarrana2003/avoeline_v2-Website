import { AuthService } from "@/src/services/authService";
import { AnalyticsService } from "@/src/services/anaylService";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { Calendar, Megaphone, Plus, Star, Users, Wallet } from "lucide-react";
import Link from "next/link";

import TodaysSchedule from "@/src/features/dashboard/components/TodaysSchedule";
import UpcomingEvents from "@/src/features/dashboard/components/UpcomingEvents";
import RecentRegistrations from "@/src/features/dashboard/components/RecentRegistrations";
import RegistrationTrendChart from "@/src/features/dashboard/components/RegistrationTrendChart";

export default async function Dashboard() {
    const u = await AuthService.getCurrentUser();

    const stats = await AnalyticsService.getDashboardStat(u.id);
    const today_events = await AnalyticsService.getTodayEvents(u.id);
    const upcoming_events = await AnalyticsService.getUpcomingEvents(u.id);
    const recent_reg = await AnalyticsService.getRecentReg(u.id);
    const reg_trend_data = await AnalyticsService.getRegTrend(u.id);

    return (
        <main className="min-h-screen bg-[#f4f2f5] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <section className="flex flex-col gap-5 rounded-lg border border-white/80 bg-white/80 p-6 shadow-[0_18px_45px_rgba(21,27,38,0.06)] sm:flex-row sm:items-center sm:justify-between">
                    <div className="border-l-4 border-[#7454f6] pl-5">
                        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                            Welcome back, {u.name}
                        </h1>
                        
                    </div>

                    <Link
                        href="/organizer/analytics"
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#7454f6] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(116,84,246,0.28)] transition hover:bg-[#6043df]"
                    >
                        View Analytics
                    </Link>
                </section>

                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard_dashboard
                        title="Active Events"
                        value={String(stats.activeEvents)}
                        icon={<Calendar size={20} />}
                    />

                    <StatCard_dashboard
                        title="Registrations"
                        value={stats.registrations}
                        icon={<Users size={20} />}
                    />

                    <StatCard_dashboard
                        title="Revenue"
                        value={stats.revenue}
                        icon={<Wallet size={20} />}
                    />

                    <StatCard_dashboard
                        title="Avg Rating"
                        value={String(stats.avgRating)}
                        icon={<Star size={20} />}
                    />
                </section>

                <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.95fr)]">
                    <div className="space-y-8">
                        <TodaysSchedule events={today_events} />
                        <RecentRegistrations registerations={recent_reg} />
                        <RegistrationTrendChart data={reg_trend_data} />
                    </div>

                    <aside className="space-y-8">
                        <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/organizer/events/create"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
                                >
                                    <Plus size={16} />
                                    Create Event
                                </Link>
                                <Link
                                    href="/organizer/notifications"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-extrabold text-slate-950 transition hover:bg-slate-200"
                                >
                                    <Megaphone size={16} />
                                    Announce
                                </Link>
                            </div>
                        </div>

                        <UpcomingEvents events={upcoming_events} />

                        <section className="rounded-lg border border-slate-200/80 border-l-4 border-l-slate-950 bg-white p-6 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
                            <div className="mb-5 flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-full border border-slate-300 text-slate-700">
                                    <Calendar size={15} />
                                </span>
                                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                                    Pending Tasks
                                </h2>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    ["Approve speaker list", "TechVerse Hackathon"],
                                    ["Send final venue payment", "Product Launch '26"],
                                    ["Review catering menu", "AI Workshop"],
                                ].map(([title, subtitle]) => (
                                    <li key={title} className="flex gap-3">
                                        <span className="mt-1 size-4 rounded-full border border-slate-300" />
                                        <div>
                                            <p className="text-sm font-extrabold text-slate-800">{title}</p>
                                            <p className="text-xs font-semibold text-slate-400">{subtitle}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </aside>
                </section>
            </div>
        </main>
    )
}
