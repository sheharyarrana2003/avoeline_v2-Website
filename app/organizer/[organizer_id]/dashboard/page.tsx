import { Suspense } from "react";
import { AuthService } from "@/src/features/auth/authService";
import { AnalyticsService } from "@/src/services/anaylService";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { Calendar, Plus, Star, Users, Wallet, Bot } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";

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

    // The <main> landmark comes from app/organizer/layout.tsx. A second one here was
    // invalid nesting, and its own background is what made the page flash a
    // different grey between the loading and loaded frames.
    return (
        <div className="px-4 py-8 text-ink sm:px-6 lg:px-8 font-sans">
            <div className="mx-auto max-w-6xl space-y-10">
                <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-3xl text-ink">Welcome back, {u.name}</h1>
                        <p className="mt-1 text-sm text-ink-soft">Manage your events, registrations, and analytics.</p>
                    </div>
                    {/* wraps: two h-11 buttons need ~312px and the narrowest target is 320px */}
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/organizer/${organizer_id}/chatbot`} className={buttonClass("secondary", "lg")}>
                            <Bot size={16} />
                            Chat with AI
                        </Link>
                        <Link href={`/organizer/${organizer_id}/events/create`} className={buttonClass("primary", "lg")}>
                            <Plus size={16} />
                            Create event
                        </Link>
                    </div>
                </header>

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
                        <Suspense fallback={<WidgetSkeleton height="h-48" />}>
                            <DashboardUpcoming organizerId={organizer_id} />
                        </Suspense>
                    </aside>
                </section>
            </div>
        </div>
    );
}

// ── Streamed data regions ──────────────────────────────────────────────────────

async function DashboardStats({ organizerId }: { organizerId: string }) {
    const { stats } = await AnalyticsService.getDashboardData(organizerId);
    // One band, not four cards: two rules and three dividers carry the grouping that
    // four borders, radii and shadows used to.
    return (
        <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
            <StatCard_dashboard title="Active Events" value={String(stats.activeEvents)} icon={<Calendar size={14} />} />
            <StatCard_dashboard title="Registrations" value={stats.registrations} icon={<Users size={14} />} />
            <StatCard_dashboard title="Revenue" value={stats.revenue} icon={<Wallet size={14} />} />
            <StatCard_dashboard title="Avg Rating" value={String(stats.avgRating)} icon={<Star size={14} />} />
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

// These must match DashboardStats and the uncarded widgets exactly. A skeleton that
// resolves into a different shape reads as a bug on every navigation, and this route
// previously had three disagreeing frames: the page, these fallbacks, and loading.tsx.
//
// gray-200 rather than gray-100 for the fill: the page sits on --canvas (#FAFAFA), and
// gray-100 against it is 1.04:1 — a skeleton nobody can see. gray-200 is 1.21:1, which
// is still decoration, so role/aria-label carry the state for anyone who cannot see it.

function StatsSkeleton() {
    return (
        <section
            role="status"
            aria-label="Loading statistics"
            className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line"
        >
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mx-0 h-14 animate-pulse rounded-xs bg-gray-200 sm:mx-6" />
            ))}
        </section>
    );
}

function WidgetSkeleton({ height }: { height: string }) {
    return (
        <div
            role="status"
            aria-label="Loading"
            className={`${height} animate-pulse rounded-xs bg-gray-200`}
        />
    );
}
