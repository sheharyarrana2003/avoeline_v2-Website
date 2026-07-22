import { Suspense } from "react";
import { AuthService } from "@/src/features/auth/authService";
import { AnalyticsService } from "@/src/services/anaylService";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { Calendar, Plus, Star, Users, Wallet } from "lucide-react";
import Link from "next/link";

import TodaysSchedule from "@/src/features/dashboard/components/TodaysSchedule";
import UpcomingEvents from "@/src/features/dashboard/components/UpcomingEvents";
import RecentRegistrations from "@/src/features/dashboard/components/RecentRegistrations";
import RegistrationTrendChart from "@/src/features/dashboard/components/RegistrationTrendChart.lazy";
import { CurrentUserData } from "@/src/services/models/user.type";
import { redirect } from "next/navigation";

export default async function Dashboard({ params }: { params: Promise<{ organizer_id: string }> }) {
    const { organizer_id } = await params;

    // Fast, request-cached auth read — needed for the redirect and the greeting.
    const u: CurrentUserData | null = await AuthService.getCurrentUser();

    if (u === null) {
        redirect('/auth/signup');
    }

    // The shell below renders immediately; the data-fed regions are streamed in
    // behind <Suspense> so the page paints without waiting on the Firestore read.
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
                        href={`/organizer/${organizer_id}/analytics`}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#7454f6] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(116,84,246,0.28)] transition hover:bg-[#6043df]"
                    >
                        View Analytics
                    </Link>
                </section>

                <Suspense fallback={<StatsSkeleton />}>
                    <DashboardStats organizerId={organizer_id} />
                </Suspense>

                <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.95fr)]">
                    <div className="space-y-8">
                        <Suspense fallback={<WidgetSkeleton height="h-64" />}>
                            <DashboardMain organizerId={organizer_id} />
                        </Suspense>
                    </div>

                    <aside className="space-y-8">
                        <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
                            <div className="grid grid-cols-1 gap-3">
                                <Link
                                    href={`/organizer/${organizer_id}/events/create`}
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
                                >
                                    <Plus size={16} />
                                    Create Event
                                </Link>
                            </div>
                        </div>

                        <Suspense fallback={<WidgetSkeleton height="h-48" />}>
                            <DashboardUpcoming organizerId={organizer_id} />
                        </Suspense>
                    </aside>
                </section>
            </div>
        </main>
    )
}

// ── Streamed data regions (all share one cache()'d getDashboardData read) ──────

async function DashboardStats({ organizerId }: { organizerId: string }) {
    const { stats } = await AnalyticsService.getDashboardData(organizerId);
    return (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard_dashboard title="Active Events" value={String(stats.activeEvents)} icon={<Calendar size={20} />} />
            <StatCard_dashboard title="Registrations" value={stats.registrations} icon={<Users size={20} />} />
            <StatCard_dashboard title="Revenue" value={stats.revenue} icon={<Wallet size={20} />} />
            <StatCard_dashboard title="Avg Rating" value={String(stats.avgRating)} icon={<Star size={20} />} />
        </section>
    );
}

async function DashboardMain({ organizerId }: { organizerId: string }) {
    const { todayEvents, recentReg, regTrend } = await AnalyticsService.getDashboardData(organizerId);
    return (
        <>
            <TodaysSchedule events={todayEvents} />
            <RecentRegistrations registerations={recentReg} />
            <RegistrationTrendChart data={regTrend} />
        </>
    );
}

async function DashboardUpcoming({ organizerId }: { organizerId: string }) {
    const { upcomingEvents } = await AnalyticsService.getDashboardData(organizerId);
    return <UpcomingEvents events={upcomingEvents} />;
}

// ── Skeletons shown while the regions stream ───────────────────────────────────

function StatsSkeleton() {
    return (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg border border-slate-200/80 bg-white/70" />
            ))}
        </section>
    );
}

function WidgetSkeleton({ height }: { height: string }) {
    return (
        <div className={`${height} animate-pulse rounded-lg border border-slate-200/80 bg-white/70 shadow-[0_18px_45px_rgba(21,27,38,0.06)]`} />
    );
}
