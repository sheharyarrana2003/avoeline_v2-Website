import { AnalyticsService } from "@/src/services/anaylService";
import { analyzeOrganizerFeedback } from "@/src/features/analytics/feedbackAnalysis.service";
import { parseAnalyticsFilters } from "@/src/features/analytics/analytics.filters";
import { CalendarDays, ClipboardCheck, Smile, TrendingUp, Users, Wallet } from "lucide-react";
import EventFeedbackAnalysis from "./EventFeedbackAnalysis";
import AnalyticsFiltersBar from "./AnalyticsFiltersBar";
import AnalyticsChartPanel from "./AnalyticsChartPanel";
import EventPerformanceTable from "./EventPerformanceTable";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { Breadcrumbs } from "@/src/shared_components/ui/Breadcrumbs";

function deltaLabel(deltaPct: number | null): string | undefined {
  if (deltaPct == null) return undefined;
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct}% vs previous period`;
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizer_id } = await params;
  const sp = await searchParams;
  const filters = parseAnalyticsFilters(sp);
  const basePath = `/organizer/${organizer_id}/analytics`;

  const data = await AnalyticsService.getAnalyticsData(organizer_id, filters);
  const { tiles, dailySeries, eventPerformanceRows, eventOptions, dateRangeLabel } = data;

  const loadAnalysis = async () => {
    "use server";
    return analyzeOrganizerFeedback(organizer_id, { eventId: filters.eventId });
  };
  const refreshAnalysis = async () => {
    "use server";
    return analyzeOrganizerFeedback(organizer_id, {
      eventId: filters.eventId,
      forceRefresh: true,
    });
  };

  const eventTitles = Object.fromEntries(eventOptions.map((e) => [e.id, e.title]));

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: `/organizer/${organizer_id}/dashboard` },
            { label: "Analytics" },
          ]}
        />

        <PageHeader
          title="Analytics"
          description="Registrations, revenue, and attendee feedback for your events"
        />

        <AnalyticsFiltersBar
          organizerId={organizer_id}
          basePath={basePath}
          filters={filters}
          eventOptions={eventOptions}
          rangeLabel={dateRangeLabel}
        />

        <section className="grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label="Registrations"
            value={tiles.registrations.value}
            sublabel={
              <>
                {tiles.registrations.peopleHelper}
                {deltaLabel(tiles.registrations.deltaPct) ? (
                  <span className="mt-1 block">{deltaLabel(tiles.registrations.deltaPct)}</span>
                ) : null}
              </>
            }
            icon={<Users size={14} />}
          />
          <MetricTile
            label="Revenue"
            value={tiles.revenue.value}
            sublabel={
              <>
                {tiles.revenue.helper}
                {deltaLabel(tiles.revenue.deltaPct) ? (
                  <span className="mt-1 block">{deltaLabel(tiles.revenue.deltaPct)}</span>
                ) : null}
              </>
            }
            icon={<Wallet size={14} />}
          />
          <MetricTile
            label="Net after costs"
            value={tiles.netAfterCosts.value}
            sublabel={
              <>
                {tiles.netAfterCosts.helper}
                {deltaLabel(tiles.netAfterCosts.deltaPct) ? (
                  <span className="mt-1 block">{deltaLabel(tiles.netAfterCosts.deltaPct)}</span>
                ) : null}
              </>
            }
            icon={<TrendingUp size={14} />}
          />
          <MetricTile
            label="Satisfaction"
            value={tiles.satisfaction.value}
            sublabel={tiles.satisfaction.helper}
            icon={<Smile size={14} />}
          />
          <MetricTile
            label="Events"
            value={tiles.events.value}
            sublabel={tiles.events.helper}
            icon={<CalendarDays size={14} />}
          />
          <MetricTile
            label="Check-in rate"
            value={tiles.checkInRate.value}
            sublabel={tiles.checkInRate.helper}
            icon={<ClipboardCheck size={14} />}
          />
        </section>

        <Card title="Registration trend">
          <CardBody>
            <AnalyticsChartPanel series={dailySeries} eventTitles={eventTitles} />
          </CardBody>
        </Card>

        <Card title="Event performance">
          <EventPerformanceTable
            rows={eventPerformanceRows}
            basePath={basePath}
            filters={filters}
          />
        </Card>

        <EventFeedbackAnalysis loadAnalysis={loadAnalysis} refreshAnalysis={refreshAnalysis} />
      </div>
    </div>
  );
}
