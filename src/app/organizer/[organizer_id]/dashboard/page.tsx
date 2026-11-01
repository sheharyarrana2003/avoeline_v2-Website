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
    redirect("/auth/signup");
  }

  const isPlatformAdmin = u.role === "platform_admin" || u.userType === "admin";
  const isSelf = u.userId === organizer_id;
  const isManagedOrg =
    u.role === "department_admin" &&
    (u.orgId === organizer_id || u.managedOrgIds?.includes(organizer_id));

  if (!isPlatformAdmin && !isSelf && !isManagedOrg) {
    redirect("/access-denied?reason=unauthorized_organizer");
  }

  const displayName = u.name?.trim() || u.email?.split("@")[0]?.trim() || "";

  return (
    <div className="px-4 py-8 text-ink sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              {displayName ? `Welcome back, ${displayName}` : "Welcome back"}
            </h1>
            <p className="text-sm text-ink-soft">
              Manage your events, registrations, and analytics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/organizer/${organizer_id}/chatbot`}
              className={buttonClass("secondary", "md")}
            >
              <Bot size={16} aria-hidden="true" />
              Chat with AI
            </Link>
            <Link
              href={`/organizer/${organizer_id}/events/create`}
              className={buttonClass("primary", "md")}
            >
              <Plus size={16} aria-hidden="true" />
              Create event
            </Link>
          </div>
        </header>

        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats organizerId={organizer_id} />
        </Suspense>

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

async function DashboardStats({ organizerId }: { organizerId: string }) {
  const { stats, todayEvents } = await AnalyticsService.getDashboardData(organizerId);

  const registrationsSublabel =
    stats.teamsCount > 0
      ? `${stats.teamsCount} ${stats.teamsCount === 1 ? "team" : "teams"} · ${stats.peopleCount} ${stats.peopleCount === 1 ? "person" : "people"}`
      : `across ${stats.activeEvents} active ${stats.activeEvents === 1 ? "event" : "events"}`;

  const ratingValue = stats.avgRating == null ? "—" : String(stats.avgRating);
  const ratingSublabel = stats.avgRating == null ? "No reviews yet" : "Across your event reviews";

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
      <div className="ink-panel on-ink relative overflow-hidden rounded-xl border border-neutral-800 p-6 shadow-xs">
        <p className="text-2xs font-medium uppercase tracking-wider text-white/60">Registrations</p>
        <p className="figure mt-2.5 text-5xl font-bold tracking-tight text-white">
          {stats.registrations}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-white/70">
          <Users size={14} aria-hidden="true" />
          {registrationsSublabel}
        </p>
      </div>

      <div className="grid grid-cols-1 rounded-xl border border-line bg-paper shadow-xs sm:grid-cols-3">
        <MetricTile
          label="Active events"
          value={String(stats.activeEvents)}
          icon={<Calendar size={14} />}
          sublabel={
            todayEvents.length > 0 ? `${todayEvents.length} happening today` : "Nothing on today"
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
          value={ratingValue}
          icon={<Star size={14} />}
          sublabel={ratingSublabel}
        />
      </div>
    </section>
  );
}

async function DashboardMain({ organizerId }: { organizerId: string }) {
  const { todayEvents, recentReg, regTrend } = await AnalyticsService.getDashboardData(organizerId);

  return (
    <div className="space-y-6">
      <Card title="Today's schedule">
        <CardBody>
          <TodaysSchedule events={todayEvents} />
        </CardBody>
      </Card>

      <Card
        title="Registrations this week"
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
            View all
          </Link>
        }
      >
        <div className="pb-1">
          <RecentRegistrations registerations={recentReg} organizerId={organizerId} />
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

function StatsSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading statistics"
      className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]"
    >
      <div className="h-44 animate-pulse rounded-xl bg-muted-strong" />
      <div className="grid grid-cols-2 rounded-xl border border-line bg-paper sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-line p-5 not-last:border-r sm:p-6">
            <div className="h-3 w-20 animate-pulse rounded-md bg-muted-strong" />
            <div className="mt-3 h-9 w-24 animate-pulse rounded-md bg-muted-strong" />
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
      className={`${height} animate-pulse rounded-xl bg-muted-strong`}
    />
  );
}
