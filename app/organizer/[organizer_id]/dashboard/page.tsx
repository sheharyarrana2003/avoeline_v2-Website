import { Suspense } from "react";
import { AuthService } from "@/src/features/auth/authService";
import { AnalyticsService } from "@/src/services/anaylService";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
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

    // `name` comes straight off the session token and is routinely empty — accounts
    // created before the setup step, or any flow that never set a display name. The
    // heading interpolated it unguarded, so those users were greeted with
    // "Welcome back," and a dangling comma.
    //
    // Falls back to the local part of the email, matching the chain authService
    // already uses when it derives an organization name (`current.name ||
    // current.email`). With neither, the comma is dropped rather than trailing a
    // filler word: "Welcome back" is a complete greeting on its own.
    const displayName = u.name?.trim() || u.email?.split("@")[0]?.trim() || "";

    // The <main> landmark comes from app/organizer/layout.tsx. A second one here was
    // invalid nesting, and its own background is what made the page flash a
    // different grey between the loading and loaded frames.
    return (
        <div className="px-4 py-8 text-ink sm:px-6 lg:px-8 font-sans">
            <div className="mx-auto max-w-6xl space-y-10">
                <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-3xl text-ink">
                            {displayName ? `Welcome back, ${displayName}` : "Welcome back"}
                        </h1>
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
    // getDashboardData is cache()-wrapped, so pulling todayEvents here as well as in
    // DashboardMain costs nothing — the three Suspense regions share one fetch.
    const { stats, todayEvents } = await AnalyticsService.getDashboardData(organizerId);

    // One figure carries the screen and the other three support it, rather than four
    // equal tiles where nothing is the answer to "how is it going". The lead sits on
    // ink because with hue gone, a large dark shape is the only way to say "start
    // here" — the nav rail was the only dark region in the product and the pages
    // behind it had no anchor at all.
    //
    // The sublabels name each figure's SOURCE. That matters more than it looks: these
    // four numbers come from four different collections, and "Revenue" next to
    // "Registrations" reads as revenue *from* those registrations, which is exactly
    // what it is — but "Avg Rating" is the reviews collection and says nothing about
    // either. Nothing here is a new number; it is the same value, labelled honestly.
    return (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
            <div className="ink-panel on-ink relative overflow-hidden rounded-2xl p-7 shadow-lg">
                <p className="text-2xs font-medium uppercase text-white/50">Registrations</p>
                <p className="figure mt-3 text-6xl text-white">{stats.registrations}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-white/60">
                    <Users size={14} aria-hidden="true" />
                    across {stats.activeEvents} active {stats.activeEvents === 1 ? "event" : "events"}
                </p>
            </div>

            <div className="grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-3">
                <MetricTile
                    label="Active events"
                    value={String(stats.activeEvents)}
                    icon={<Calendar size={14} />}
                    sublabel={
                        todayEvents.length > 0
                            ? `${todayEvents.length} happening today`
                            : "Nothing on today"
                    }
                />
                <MetricTile
                    label="Revenue"
                    value={stats.revenue}
                    icon={<Wallet size={14} />}
                    sublabel="Paid across all registrations"
                />
                <MetricTile
                    label="Avg rating"
                    value={String(stats.avgRating)}
                    icon={<Star size={14} />}
                    sublabel={stats.avgRating > 0 ? "Across your event reviews" : "No reviews yet"}
                />
            </div>
        </section>
    );
}

async function DashboardMain({ organizerId }: { organizerId: string }) {
    const { todayEvents, recentReg, regTrend } = await AnalyticsService.getDashboardData(organizerId);

    // Carded, where these three were uncarded <section>s separated by a bottom rule.
    // Three widgets of identical weight stacked down a page is what made the dashboard
    // read as a list of headings; containment is what gives them rank.
    return (
        <div className="space-y-6">
            <Card title="Today's schedule">
                <CardBody>
                    <TodaysSchedule events={todayEvents} />
                </CardBody>
            </Card>

            <Card
                title="Registration trend"
                action={<span className="text-xs text-ink-soft">Last 7 days</span>}
            >
                <CardBody>
                    <RegistrationTrendChart data={regTrend} />
                </CardBody>
            </Card>

            <Card
                title="Recent registrations"
                action={
                    <Link href={`/organizer/${organizerId}/analytics`} className={buttonClass("ghost", "sm")}>
                        Analytics
                    </Link>
                }
            >
                <div className="pb-1">
                    <RecentRegistrations registerations={recentReg} />
                </div>
            </Card>
        </div>
    );
}

async function DashboardUpcoming({ organizerId }: { organizerId: string }) {
    const { upcomingEvents } = await AnalyticsService.getDashboardData(organizerId);
    return (
        <Card
            title="Upcoming events"
            action={
                <Link href={`/organizer/${organizerId}/events`} className={buttonClass("ghost", "sm")}>
                    View all
                </Link>
            }
        >
            <CardBody>
                <UpcomingEvents events={upcomingEvents} />
            </CardBody>
        </Card>
    );
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
        <section role="status" aria-label="Loading statistics" className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
            <div className="h-44 animate-pulse rounded-2xl bg-muted-strong" />
            <div className="grid grid-cols-2 rounded-2xl border border-line bg-paper sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-line p-5 not-last:border-r sm:p-6">
                        <div className="h-3 w-20 animate-pulse rounded-xs bg-muted-strong" />
                        <div className="mt-3 h-9 w-24 animate-pulse rounded-xs bg-muted-strong" />
                    </div>
                ))}
            </div>
        </section>
    );
}

function WidgetSkeleton({ height }: { height: string }) {
    return (
        <div
            role="status"
            aria-label="Loading"
            className={`${height} animate-pulse rounded-xs bg-muted-strong`}
        />
    );
}
