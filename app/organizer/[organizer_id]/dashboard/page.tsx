import { Suspense } from "react";
import { AuthService } from "@/src/features/auth/authService";
import { AnalyticsService } from "@/src/services/anaylService";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { Calendar, Plus, Star, Users, Wallet, Bot } from "lucide-react";
import Link from "next/link";

import TodaysSchedule from "@/src/features/dashboard/components/TodaysSchedule";
import RecentRegistrations from "@/src/features/dashboard/components/RecentRegistrations";
import RegistrationTrendChart from "@/src/features/dashboard/components/RegistrationTrendChart.lazy";
import { CurrentUserData } from "@/src/services/models/user.type";
import { redirect } from "next/navigation";
import UpcomingEvents from "@/src/features/dashboard/components/UpcomingEvents";

export default async function Dashboard({ params }: { params: Promise<{ organizer_id: string }> }) {
    const { organizer_id } = await params;

    const u: CurrentUserData | null = await AuthService.getCurrentUser();

    if (u === null) {
        redirect('/auth/signup');
    }

    return (
        <main className="min-h-screen bg-[#E5E5E5] px-4 py-8 text-gray-900 sm:px-6 lg:px-8 font-sans">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Welcome Header Card */}
                <section className="bg-[#F5F5F5] rounded-2xl border border-gray-300/60 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-base shadow-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'O'}
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                                Welcome back, {u.name}!
                            </h1>
                            <p className="text-xs text-gray-500">Manage your events, registrations, and analytics.</p>
                        </div>
                    </div>

                    <Link
                        href={`/organizer/${organizer_id}/chatbot`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-gray-800"
                    >
                        <Bot size={16} />
                        Chat With AI
                    </Link>
                </section>

                {/* Streamed Stats Cards */}
                <Suspense fallback={<StatsSkeleton />}>
                    <DashboardStats organizerId={organizer_id} />
                </Suspense>

                {/* Main Dashboard Layout */}
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                    <div className="space-y-6">
                        <Suspense fallback={<WidgetSkeleton height="h-64" />}>
                            <DashboardMain organizerId={organizer_id} />
                        </Suspense>
                    </div>

                    <aside className="space-y-6">
                        {/* Quick Create Event Card */}
                        <div className="bg-[#F5F5F5] rounded-2xl border border-gray-300/60 p-5 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">Quick Action</h3>
                            <Link
                                href={`/organizer/${organizer_id}/events/create`}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-xs font-bold text-white transition hover:bg-gray-800 shadow-xs"
                            >
                                <Plus size={16} />
                                Create New Event
                            </Link>
                        </div>

                        <Suspense fallback={<WidgetSkeleton height="h-48" />}>
                            <DashboardUpcoming organizerId={organizer_id} />
                        </Suspense>
                    </aside>
                </section>
            </div>
        </main>
    );
}

// ── Streamed data regions ──────────────────────────────────────────────────────

async function DashboardStats({ organizerId }: { organizerId: string }) {
    const { stats } = await AnalyticsService.getDashboardData(organizerId);
    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard_dashboard title="Active Events" value={String(stats.activeEvents)} icon={<Calendar size={18} />} />
            <StatCard_dashboard title="Registrations" value={stats.registrations} icon={<Users size={18} />} />
            <StatCard_dashboard title="Revenue" value={stats.revenue} icon={<Wallet size={18} />} />
            <StatCard_dashboard title="Avg Rating" value={String(stats.avgRating)} icon={<Star size={18} />} />
        </section>
    );
}

async function DashboardMain({ organizerId }: { organizerId: string }) {
    const { todayEvents, recentReg, regTrend } = await AnalyticsService.getDashboardData(organizerId);
    return (
        <div className="space-y-6">
            <TodaysSchedule events={todayEvents} />
            <RecentRegistrations registerations={recentReg} />
            <RegistrationTrendChart data={regTrend} />
        </div>
    );
}

async function DashboardUpcoming({ organizerId }: { organizerId: string }) {
    const { upcomingEvents } = await AnalyticsService.getDashboardData(organizerId);
    return <UpcomingEvents events={upcomingEvents} />;
}

// ── Stream Skeletons ─────────────────────────────────────────────────────────

function StatsSkeleton() {
    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl border border-gray-300/60 bg-[#F5F5F5]" />
            ))}
        </section>
    );
}

function WidgetSkeleton({ height }: { height: string }) {
    return (
        <div className={`${height} animate-pulse rounded-2xl border border-gray-300/60 bg-[#F5F5F5]`} />
    );
}
