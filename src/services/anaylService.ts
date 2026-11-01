import { cache } from "react";
import {
  AnalyticsEventPerformance,
  AnalyticsMetric,
  DailyAnalyticsRegistration,
} from "@/src/services/models/feedback.model";
import {
  DashboardEvent,
  RecentRegistration,
  DailyRegistrationTrend,
} from "@/src/features/dashboard/types";
import {
  formatDate,
  parseScheduleDateTime,
  toDate as parseDate,
  toIsoDate,
} from "@/src/lib/datetime";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { formatCurrencyCompact } from "@/src/lib/money";
import { UserService } from "@/src/services/user.service";
import { fetchOrganizerEventReviewRows } from "@/src/services/feedback.service";
import { hydrateRegistrationRow, mapToRegistration } from "@/src/services/registeration.service";
import { mapToTeam } from "@/src/features/hackathon/hackathon.service";
import type { Registration } from "@/src/services/models/reg.type";
import {
  applyAttendeeNames,
  buildOccupying,
  deriveDashboardStat,
  deriveRecentReg,
  deriveRegTrend,
  tallyByEventOccupancy,
  type EventLite,
  type EventTally,
  type GroupLite,
  type TeamLite,
} from "@/src/features/dashboard/dashboardDerive";
import {
  parseAnalyticsFilters,
  resolveAnalyticsDateRange,
  formatRangeLabel,
  type AnalyticsFilters,
} from "@/src/features/analytics/analytics.filters";
import {
  deriveAnalyticsTiles,
  deriveDailyRegistrations,
  deriveEventPerformance,
  filterOccupyingByCreatedAt,
  type BookingLite,
  type ExpenseLite,
  type EventDocLite,
  type AnalyticsEventRow,
  type DailySeriesPoint,
} from "@/src/features/analytics/analyticsDerive";

type QueryDocumentSnapshot = { id: string; data: () => Record<string, any> };
type QuerySnapshot = { empty: boolean; size: number; docs: QueryDocumentSnapshot[] };

function asSnap(id: string, data: Record<string, any>): QueryDocumentSnapshot {
  return { id, data: () => data };
}

function hydrateEventRow(row: Record<string, any>): Record<string, any> {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<
    string,
    any
  >;
  const schedule = (
    extra.schedule && typeof extra.schedule === "object" ? extra.schedule : {}
  ) as Record<string, any>;
  return {
    ...extra,
    ...row,
    id: row.id,
    organizerId: row.organizer_id || extra.organizerId,
    title: row.title,
    status: row.status || extra.status || "draft",
    createdAt: row.created_at || extra.createdAt,
    bannerImage: row.banner_image || extra.bannerImage || "",
    schedule: {
      startDate: schedule.startDate || row.start_date,
      startTime: schedule.startTime || row.start_time,
      endDate: schedule.endDate || row.end_date,
      endTime: schedule.endTime || row.end_time,
      timezone: schedule.timezone || row.timezone,
      ...schedule,
    },
    location: extra.location || {
      venueName: row.venue_name,
      city: row.city,
      country: row.country,
      address: row.address,
    },
    capacity: extra.capacity || { totalSeats: row.total_seats },
    analytics: extra.analytics || { registrations: row.registrations_count },
  };
}

function hydrateBookingRow(row: Record<string, any>): Record<string, any> {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<
    string,
    any
  >;
  return {
    ...extra,
    ...row,
    id: row.id,
    organizerId: row.organizer_id || extra.organizerId,
    eventId: row.event_id || extra.eventId,
    status: row.status || extra.status,
    totalAmount: row.total_amount ?? extra.totalAmount,
    amount: row.amount ?? extra.amount,
    createdAt: row.created_at || extra.createdAt,
  };
}

function toDate(val: any): Date {
  if (!val) return new Date(0);
  if (typeof val.toDate === "function") return val.toDate();
  return new Date(val);
}

function eventStart(data: any): Date {
  return (
    parseScheduleDateTime(data.schedule?.startDate, data.schedule?.startTime) ??
    toDate(data.eventStartTime)
  );
}
function eventEnd(data: any): Date {
  return (
    parseScheduleDateTime(data.schedule?.endDate, data.schedule?.endTime) ??
    toDate(data.eventEndTime)
  );
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

type Docs = QueryDocumentSnapshot[];

export type { EventTally };

function computeRevenue(occupying: Registration[]): number {
  let total = 0;
  for (const reg of occupying) {
    total += Number(reg.payment?.amountPaid ?? reg.finalPrice ?? 0) || 0;
  }
  return total;
}

const DASHBOARD_STATUS_MAP: Record<string, DashboardEvent["status"]> = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  REGISTRATION_OPEN: "REGISTERATION_OPEN",
  ONGOING: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

function toDashboardEvent(
  doc: QueryDocumentSnapshot,
  organizerId: string,
  tallies?: Map<string, EventTally>,
): DashboardEvent {
  const data = doc.data();
  const rawStatus = (data.status || "draft").toUpperCase();
  return {
    id: doc.id,
    organizerId: data.organizerId || organizerId,
    title: data.title || "Untitled Event",
    startDate: eventStart(data),
    endDate: eventEnd(data),
    location: data.location?.venueName || data.location?.city || "—",
    bannerUrl: data.bannerImage || null,
    registeredCount: tallies?.get(doc.id)?.registrations ?? data.analytics?.registrations ?? 0,
    maxCapacity: data.capacity?.totalSeats ?? 0,
    status: DASHBOARD_STATUS_MAP[rawStatus] ?? "DRAFT",
  };
}

function deriveTodayEvents(
  eventDocs: Docs,
  organizerId: string,
  tallies?: Map<string, EventTally>,
): DashboardEvent[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const results: DashboardEvent[] = [];
  eventDocs.forEach((doc) => {
    const data = doc.data();
    const start = eventStart(data);
    const end = eventEnd(data);
    if (start <= todayEnd && end >= todayStart) {
      results.push(toDashboardEvent(doc, organizerId, tallies));
    }
  });
  return results;
}

function deriveUpcomingEvents(
  eventDocs: Docs,
  organizerId: string,
  tallies?: Map<string, EventTally>,
): DashboardEvent[] {
  const now = new Date();
  const results: DashboardEvent[] = [];
  eventDocs.forEach((doc) => {
    const start = eventStart(doc.data());
    if (start > now) {
      results.push(toDashboardEvent(doc, organizerId, tallies));
    }
  });
  results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return results.slice(0, 5);
}

async function withAttendeeNames(
  rows: (RecentRegistration & { userId: string })[],
): Promise<RecentRegistration[]> {
  const missing = rows
    .filter((r) => (!r.attendeeName || r.attendeeName === "Attendee") && r.userId)
    .map((r) => r.userId);
  const users = missing.length ? await UserService.getUsersByIds(missing) : new Map();
  const mapped = new Map<string, { profile?: { fullName?: string }; email?: string }>();
  users.forEach((u, id) => {
    mapped.set(id, { profile: { fullName: u.profile?.fullName }, email: u.email });
  });
  return applyAttendeeNames(rows, mapped);
}

function deriveTotalEvents(eventDocs: Docs): AnalyticsMetric {
  let draft = 0,
    published = 0,
    completed = 0;
  eventDocs.forEach((doc) => {
    const s = (doc.data().status || "").toLowerCase();
    if (s === "draft") draft++;
    else if (["published", "registration_open", "ongoing", "active"].includes(s)) published++;
    else if (s === "completed") completed++;
  });
  return {
    value: String(eventDocs.length),
    helper: `${draft} draft, ${published} published, ${completed} completed`,
  };
}

const COMMITTED_BOOKING_STATUSES = new Set([
  "quote_accepted",
  "confirmed",
  "in_progress",
  "completed",
]);

function vendorSpendByEvent(bookingDocs: Docs): Map<string, number> {
  const spend = new Map<string, number>();
  bookingDocs.forEach((doc) => {
    const data = doc.data();
    if (!COMMITTED_BOOKING_STATUSES.has(String(data.status || "").toLowerCase())) return;
    const amount =
      Number(data.payment?.totalAmount ?? data.quote?.vendorQuote?.totalAmount ?? 0) || 0;
    if (!amount) return;
    const eventId = data.eventId || "";
    spend.set(eventId, (spend.get(eventId) ?? 0) + amount);
  });
  return spend;
}

function totalVendorSpend(bookingDocs: Docs): number {
  let total = 0;
  vendorSpendByEvent(bookingDocs).forEach((v) => {
    total += v;
  });
  return total;
}

function deriveNetAfterVendorSpend(occupying: Registration[], bookingDocs: Docs): AnalyticsMetric {
  const totalRevenue = computeRevenue(occupying);
  const spend = totalVendorSpend(bookingDocs);
  const net = totalRevenue - spend;
  return {
    value: formatCurrencyCompact(net),
    helper:
      spend > 0
        ? `${formatCurrencyCompact(spend)} committed to vendors`
        : "No vendor spend committed yet",
  };
}

function deriveTotalRevenue(occupying: Registration[], eventCount: number): AnalyticsMetric {
  const totalRevenue = computeRevenue(occupying);
  const avg = eventCount > 0 ? Math.round(totalRevenue / eventCount) : 0;
  return {
    value: formatCurrencyCompact(totalRevenue),
    helper: `Avg: ${formatCurrencyCompact(avg)}/event`,
  };
}

function deriveAvgSatisfaction(regs: Registration[]): AnalyticsMetric {
  let total = 0;
  let count = 0;
  regs.forEach((reg) => {
    const r = reg.rating;
    if (r && typeof r === "number" && r > 0) {
      total += r;
      count++;
    }
  });
  const avg = count > 0 ? (total / count).toFixed(1) : "N/A";
  return {
    value: avg,
    helper: count > 0 ? `Based on ${count} ratings` : "No ratings yet",
  };
}

function legacyDailyFromSeries(series: DailySeriesPoint[]): DailyAnalyticsRegistration[] {
  return series.map((p) => ({ label: p.label, registrations: p.registrations }));
}

function legacyPerformanceFromRows(rows: AnalyticsEventRow[]): AnalyticsEventPerformance[] {
  return rows.map((r) => ({
    id: r.id,
    eventName: r.eventName,
    eventType: r.eventType,
    date: r.date,
    registrations: r.registrations,
    vendorSpend: r.vendorSpend,
    netAfterVendorSpend: r.netAfterCosts,
    revenue: r.revenue,
    avgSatisfaction: r.avgSatisfaction ?? 0,
  }));
}

function toEventDocs(eventDocs: Docs): EventDocLite[] {
  return eventDocs.map((doc) => {
    const data = doc.data();
    const start = eventStart(data);
    return {
      id: doc.id,
      title: data.title || "Untitled Event",
      eventType: data.eventType || data.category || undefined,
      bannerUrl: data.bannerImage || null,
      status: data.status,
      startMs: start.getTime(),
    };
  });
}

function toBookingLites(bookingDocs: Docs): BookingLite[] {
  return bookingDocs.map((doc) => {
    const data = doc.data();
    return {
      eventId: String(data.eventId || ""),
      status: String(data.status || ""),
      amount:
        Number(
          data.payment?.totalAmount ??
            data.quote?.vendorQuote?.totalAmount ??
            data.totalAmount ??
            data.amount ??
            0,
        ) || 0,
    };
  });
}

async function fetchExpenseLites(eventIds: string[]): Promise<ExpenseLite[]> {
  if (!eventIds.length) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_EXPENSES)
    .select("event_id, amount, kind")
    .in("event_id", eventIds);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    eventId: String(row.event_id),
    amount: Number(row.amount ?? 0) || 0,
    kind: row.kind === "credit" ? "credit" : "expense",
  }));
}

function deriveDateRange(eventDocs: Docs): string {
  const now = new Date();
  const fmt = (d: Date) => formatDate(d);

  if (eventDocs.length === 0) {
    return formatDate(now);
  }

  let earliest: Date | null = null;
  eventDocs.forEach((doc) => {
    const d = eventStart(doc.data());
    const ms = d.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return;
    if (!earliest || d < earliest) earliest = d;
  });

  if (!earliest) return fmt(now);

  return `${fmt(earliest)} – ${fmt(now)}`;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchEvents(organizerId: string): Promise<QuerySnapshot> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("*")
    .eq("organizer_id", organizerId);
  if (error) throw error;
  const docs = (data ?? []).map((row) =>
    asSnap(row.id, hydrateEventRow(row as Record<string, any>)),
  );
  return { empty: docs.length === 0, size: docs.length, docs };
}

async function fetchRegistrations(organizerId: string): Promise<QuerySnapshot> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("*")
    .eq("organizer_id", organizerId);
  if (error) throw error;
  const docs = (data ?? []).map((row) =>
    asSnap(row.id, hydrateRegistrationRow(row as Record<string, unknown>)),
  );
  return { empty: docs.length === 0, size: docs.length, docs };
}

async function fetchOrganizerBookings(organizerId: string): Promise<QuerySnapshot> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.BOOKINGS)
    .select("*")
    .eq("organizer_id", organizerId);
  if (error) throw error;
  const docs = (data ?? []).map((row) =>
    asSnap(row.id, hydrateBookingRow(row as Record<string, any>)),
  );
  return { empty: docs.length === 0, size: docs.length, docs };
}

async function fetchReviews(organizerId: string): Promise<QuerySnapshot> {
  const rows = await fetchOrganizerEventReviewRows(organizerId);
  const docs = rows.map((row) =>
    asSnap(row.id, {
      ...row,
      rating: row.rating,
      targetId: row.target_id,
      targetType: row.target_type,
      createdAt: row.created_at,
    }),
  );
  return { empty: docs.length === 0, size: docs.length, docs };
}

async function fetchTeamsAndGroups(
  eventIds: string[],
  regs: Registration[],
): Promise<{ teams: TeamLite[]; groups: GroupLite[]; trackNames: Map<string, string> }> {
  if (!eventIds.length) return { teams: [], groups: [], trackNames: new Map() };

  const [teamsRes, groupsRes, tracksRes] = await Promise.all([
    supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("*").in("event_id", eventIds),
    supabaseAdmin.from(TABLES.REGISTRATION_GROUPS).select("*").in("event_id", eventIds),
    supabaseAdmin.from(TABLES.HACKATHON_TRACKS).select("id, name").in("event_id", eventIds),
  ]);

  if (teamsRes.error) throw teamsRes.error;
  if (groupsRes.error) throw groupsRes.error;
  if (tracksRes.error) throw tracksRes.error;

  const teams: TeamLite[] = (teamsRes.data ?? []).map((row) => {
    const t = mapToTeam(row, row.id);
    return {
      id: t.id,
      eventId: t.eventId,
      name: t.name,
      trackId: t.trackId,
      members: t.members.map((m) => ({
        registrationId: m.registrationId,
        isOwner: m.isOwner,
        name: m.name,
        email: m.email,
      })),
    };
  });

  const byGroup = new Map<string, string[]>();
  for (const reg of regs) {
    if (!reg.groupId) continue;
    const list = byGroup.get(reg.groupId) ?? [];
    list.push(reg.registrationId);
    byGroup.set(reg.groupId, list);
  }

  const groups: GroupLite[] = (groupsRes.data ?? []).map((row) => ({
    id: String(row.id),
    eventId: String(row.event_id),
    groupName: String(row.group_name || ""),
    leadRegistrationId: row.lead_registration_id ? String(row.lead_registration_id) : null,
    memberIds: byGroup.get(String(row.id)) ?? [],
  }));

  const trackNames = new Map<string, string>();
  for (const t of tracksRes.data ?? []) {
    trackNames.set(String(t.id), String(t.name || ""));
  }

  return { teams, groups, trackNames };
}

function regsFromDocs(regDocs: Docs): Registration[] {
  return regDocs.map((doc) => mapToRegistration(doc.data(), doc.id));
}

function eventMapFromDocs(eventDocs: Docs): Map<string, EventLite> {
  const map = new Map<string, EventLite>();
  for (const doc of eventDocs) {
    const data = doc.data();
    map.set(doc.id, {
      id: doc.id,
      title: data.title || "Untitled Event",
      bannerUrl: data.bannerImage || null,
      status: data.status,
      schedule: data.schedule,
    });
  }
  return map;
}

async function loadOccupancyBundle(organizerId: string) {
  const [eventsSnap, regsSnap, reviewsSnap] = await Promise.all([
    fetchEvents(organizerId),
    fetchRegistrations(organizerId),
    fetchReviews(organizerId),
  ]);
  const eventDocs = eventsSnap.docs;
  const regDocs = regsSnap.docs;
  const regs = regsFromDocs(regDocs);
  const eventIds = eventDocs.map((d) => d.id);
  const { teams, groups, trackNames } = await fetchTeamsAndGroups(eventIds, regs);
  const occupying = buildOccupying(regs, teams, groups);
  return {
    eventsSnap,
    regsSnap,
    reviewsSnap,
    eventDocs,
    regDocs,
    regs,
    teams,
    groups,
    trackNames,
    occupying,
    events: eventMapFromDocs(eventDocs),
  };
}

export const AnalyticsService = {
  getDashboardData: cache(async (organizerId: string) => {
    const bundle = await loadOccupancyBundle(organizerId);
    const { eventDocs, reviewsSnap, regs, teams, groups, trackNames, occupying, events } = bundle;
    const reviewRatings = reviewsSnap.docs.map((d) => Number(d.data().rating) || 0);
    const tallies = tallyByEventOccupancy(occupying);

    return {
      stats: deriveDashboardStat([...events.values()], occupying, reviewRatings, teams, groups),
      todayEvents: deriveTodayEvents(eventDocs, organizerId, tallies),
      upcomingEvents: deriveUpcomingEvents(eventDocs, organizerId, tallies),
      recentReg: await withAttendeeNames(
        deriveRecentReg({
          regs,
          occupying,
          teams,
          groups,
          events,
          trackNames,
          organizerId,
          limit: 8,
        }),
      ),
      regTrend: deriveRegTrend(occupying),
    };
  }),

  async getAnalyticsData(
    organizerId: string,
    filtersInput?:
      AnalyticsFilters | Record<string, string | string[] | undefined> | URLSearchParams,
  ) {
    const filters: AnalyticsFilters =
      filtersInput && "preset" in (filtersInput as object)
        ? (filtersInput as AnalyticsFilters)
        : parseAnalyticsFilters(
            (filtersInput as Record<string, string | string[] | undefined> | URLSearchParams) ?? {},
          );
    const range = resolveAnalyticsDateRange(filters);

    const [eventsSnap, regsSnap, bookingsSnap, reviewsSnap] = await Promise.all([
      fetchEvents(organizerId),
      fetchRegistrations(organizerId),
      fetchOrganizerBookings(organizerId),
      fetchReviews(organizerId),
    ]);
    const eventDocs = eventsSnap.docs;
    const allEvents = toEventDocs(eventDocs);
    const eventsInScope = filters.eventId
      ? allEvents.filter((e) => e.id === filters.eventId)
      : allEvents;
    const scopeIds = new Set(eventsInScope.map((e) => e.id));

    const regs = regsFromDocs(regsSnap.docs).filter(
      (r) => !filters.eventId || r.eventId === filters.eventId,
    );
    const { teams, groups } = await fetchTeamsAndGroups(
      eventsInScope.map((e) => e.id),
      regs,
    );
    const occupyingAll = buildOccupying(regs, teams, groups);
    const occupyingInRange = filterOccupyingByCreatedAt(occupyingAll, range.from, range.to);
    const occupyingPrev = range.previous
      ? filterOccupyingByCreatedAt(occupyingAll, range.previous.from, range.previous.to)
      : null;

    const bookings = toBookingLites(bookingsSnap.docs).filter((b) => scopeIds.has(b.eventId));
    const expenses = (await fetchExpenseLites([...scopeIds])).filter((e) =>
      scopeIds.has(e.eventId),
    );

    const reviewRows = reviewsSnap.docs
      .map((d) => d.data())
      .filter((row) => {
        const targetId = String(row.targetId || row.target_id || "");
        return scopeIds.has(targetId);
      });

    const reviewsInRange = reviewRows.filter((row) => {
      const d = parseDate(row.createdAt || row.created_at);
      return d && d >= range.from && d <= range.to;
    });
    const reviewsPrev = range.previous
      ? reviewRows.filter((row) => {
          const d = parseDate(row.createdAt || row.created_at);
          return d && range.previous && d >= range.previous.from && d <= range.previous.to;
        })
      : null;

    const reviewByEvent = new Map<string, number[]>();
    for (const row of reviewsInRange) {
      const id = String(row.targetId || row.target_id || "");
      const rating = Number(row.rating) || 0;
      if (!id || rating <= 0) continue;
      const list = reviewByEvent.get(id) ?? [];
      list.push(rating);
      reviewByEvent.set(id, list);
    }

    const tiles = deriveAnalyticsTiles({
      occupyingInRange,
      occupyingPrev,
      allRegsInRange: regs.filter((r) => {
        const d = parseDate(r.createdAt);
        return d != null && d >= range.from && d <= range.to;
      }),
      teams,
      groups,
      eventsInScope,
      eventsPrevCount: range.previous ? eventsInScope.length : null,
      bookings,
      expenses,
      reviewRatingsInRange: reviewsInRange.map((r) => Number(r.rating) || 0),
      reviewRatingsPrev: reviewsPrev ? reviewsPrev.map((r) => Number(r.rating) || 0) : null,
    });

    const titles = new Map(eventsInScope.map((e) => [e.id, e.title]));
    const dailySeries = deriveDailyRegistrations({
      occupying: occupyingAll,
      allRegs: regs,
      range,
      eventTitles: titles,
    });

    const eventPerformanceRows = deriveEventPerformance({
      events: eventsInScope,
      occupying: occupyingInRange,
      bookings,
      expenses,
      reviewByEvent,
    });

    return {
      filters,
      range,
      dateRangeLabel: formatRangeLabel(range),
      tiles,
      dailySeries,
      eventPerformanceRows,
      eventOptions: allEvents.map((e) => ({ id: e.id, title: e.title })),
      // Legacy shape for any remaining callers
      totalEvents: {
        value: tiles.events.value,
        helper: tiles.events.helper,
      } satisfies AnalyticsMetric,
      profit: {
        value: tiles.netAfterCosts.value,
        helper: tiles.netAfterCosts.helper,
      } satisfies AnalyticsMetric,
      totalRevenue: {
        value: tiles.revenue.value,
        helper: tiles.revenue.helper,
      } satisfies AnalyticsMetric,
      avgSatisfaction: {
        value: tiles.satisfaction.value,
        helper: tiles.satisfaction.helper,
      } satisfies AnalyticsMetric,
      dailyRegistrations: legacyDailyFromSeries(dailySeries),
      eventPerformance: legacyPerformanceFromRows(eventPerformanceRows),
      dateRange: formatRangeLabel(range),
    };
  },

  async getDashboardStat(organizerId: string) {
    const bundle = await loadOccupancyBundle(organizerId);
    const reviewRatings = bundle.reviewsSnap.docs.map((d) => Number(d.data().rating) || 0);
    return deriveDashboardStat(
      [...bundle.events.values()],
      bundle.occupying,
      reviewRatings,
      bundle.teams,
      bundle.groups,
    );
  },

  async getOrganizerProfileStats(organizerId: string) {
    const bundle = await loadOccupancyBundle(organizerId);
    const now = new Date();

    let publishedEvents = 0,
      completedEvents = 0,
      upcomingEvents = 0;
    bundle.eventDocs.forEach((doc) => {
      const data = doc.data();
      const status = (data.status || "").toLowerCase();
      if (["published", "registration_open", "ongoing", "active"].includes(status))
        publishedEvents++;
      else if (status === "completed") completedEvents++;
      if (eventStart(data) > now) upcomingEvents++;
    });

    const totalRevenue = computeRevenue(bundle.occupying);

    let totalRating = 0,
      ratedCount = 0;
    bundle.reviewsSnap.docs.forEach((doc) => {
      const rating = Number(doc.data().rating);
      if (rating > 0) {
        totalRating += rating;
        ratedCount++;
      }
    });

    const totalEventsCreated = bundle.eventsSnap.size;
    const totalAttendees = bundle.occupying.length;

    return {
      totalEventsCreated,
      totalAttendees,
      totalRevenue,
      publishedEvents,
      completedEvents,
      upcomingEvents,
      averageRating: ratedCount > 0 ? parseFloat((totalRating / ratedCount).toFixed(1)) : 0,
      averageAttendeesPerEvent: totalEventsCreated > 0 ? totalAttendees / totalEventsCreated : 0,
    };
  },

  async getTodayEvents(organizerId: string): Promise<DashboardEvent[]> {
    return deriveTodayEvents((await fetchEvents(organizerId)).docs, organizerId);
  },

  async getUpcomingEvents(organizerId: string): Promise<DashboardEvent[]> {
    return deriveUpcomingEvents((await fetchEvents(organizerId)).docs, organizerId);
  },

  async getRecentReg(organizerId: string): Promise<RecentRegistration[]> {
    const data = await AnalyticsService.getDashboardData(organizerId);
    return data.recentReg;
  },

  async getRegTrend(organizerId: string): Promise<DailyRegistrationTrend[]> {
    const data = await AnalyticsService.getDashboardData(organizerId);
    return data.regTrend;
  },

  async getAnalyticsTotalEvents(organizerId: string): Promise<AnalyticsMetric> {
    return deriveTotalEvents((await fetchEvents(organizerId)).docs);
  },

  async getAnalyticsProfit(organizerId: string): Promise<AnalyticsMetric> {
    const [eventsSnap, regsSnap, bookings] = await Promise.all([
      fetchEvents(organizerId),
      fetchRegistrations(organizerId),
      fetchOrganizerBookings(organizerId),
    ]);
    const regs = regsFromDocs(regsSnap.docs);
    const { teams, groups } = await fetchTeamsAndGroups(
      eventsSnap.docs.map((d) => d.id),
      regs,
    );
    return deriveNetAfterVendorSpend(buildOccupying(regs, teams, groups), bookings.docs);
  },

  async getAnalyticsTotalRevenue(organizerId: string): Promise<AnalyticsMetric> {
    const [evs, regsSnap] = await Promise.all([
      fetchEvents(organizerId),
      fetchRegistrations(organizerId),
    ]);
    const regs = regsFromDocs(regsSnap.docs);
    const { teams, groups } = await fetchTeamsAndGroups(
      evs.docs.map((d) => d.id),
      regs,
    );
    return deriveTotalRevenue(buildOccupying(regs, teams, groups), evs.docs.length);
  },

  async getAnalyticsAvgSatisfaction(organizerId: string): Promise<AnalyticsMetric> {
    return deriveAvgSatisfaction(regsFromDocs((await fetchRegistrations(organizerId)).docs));
  },

  getEventTallies: cache(async (organizerId: string): Promise<Map<string, EventTally>> => {
    const [eventsSnap, regsSnap] = await Promise.all([
      fetchEvents(organizerId),
      fetchRegistrations(organizerId),
    ]);
    const regs = regsFromDocs(regsSnap.docs);
    const { teams, groups } = await fetchTeamsAndGroups(
      eventsSnap.docs.map((d) => d.id),
      regs,
    );
    return tallyByEventOccupancy(buildOccupying(regs, teams, groups));
  }),

  async getAnalyticsDailyRegistrations(organizerId: string): Promise<DailyAnalyticsRegistration[]> {
    const data = await AnalyticsService.getAnalyticsData(organizerId);
    return data.dailyRegistrations;
  },

  async getAnalyticsEventPerformance(organizerId: string): Promise<AnalyticsEventPerformance[]> {
    const data = await AnalyticsService.getAnalyticsData(organizerId);
    return data.eventPerformance;
  },

  async getAnalyticsDateRange(organizerId: string): Promise<string> {
    return deriveDateRange((await fetchEvents(organizerId)).docs);
  },

  async getTotalEvents(organizerId: string): Promise<number> {
    return (await fetchEvents(organizerId)).size;
  },
};
