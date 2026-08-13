import { cache } from "react";
import {
    AnalyticsEventPerformance,
    AnalyticsMetric,
    DailyAnalyticsRegistration,
} from "@/src/services/models/feedback.model";
import { DashboardEvent, RecentRegistration, DailyRegistrationTrend } from "@/src/features/dashboard/types";
import { adminDb } from "@/data/admin_db";
import { QueryDocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";
import { formatDate, parseScheduleDateTime, toIsoString } from "@/src/lib/datetime";
import { COLLECTIONS } from "@/data/collections";
import { formatCurrencyCompact } from "@/src/lib/money";
import { UserService } from "@/src/services/user.service";


function toDate(val: any): Date {
    if (!val) return new Date(0);
    if (typeof val.toDate === "function") return val.toDate();
    return new Date(val);
}

// Event start/end now come from schedule (DD/MM/YYYY + 12h). Fall back to the
// legacy eventStartTime/eventEndTime for old docs created before the change.
function eventStart(data: any): Date {
    return parseScheduleDateTime(data.schedule?.startDate, data.schedule?.startTime) ?? toDate(data.eventStartTime);
}
function eventEnd(data: any): Date {
    return parseScheduleDateTime(data.schedule?.endDate, data.schedule?.endTime) ?? toDate(data.eventEndTime);
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

// ─── Pure derivations ─────────────────────────────────────────────────────────
// These operate on already-fetched documents so a single events/registerations
// read can feed every metric (see getDashboardData / getAnalyticsData). The
// per-method public API below keeps working by fetching then delegating here.

type Docs = QueryDocumentSnapshot[];

// Revenue = the actual amount paid on each registration, summed across the
// organizer's registrations (payment.amountPaid, falling back to finalPrice).
// This reflects real ticket sales exactly, including mixed tiers/discounts.
function computeRevenue(regDocs: Docs): number {
    let total = 0;
    regDocs.forEach((doc) => {
        const data = doc.data();
        total += Number(data.payment?.amountPaid ?? data.finalPrice ?? 0) || 0;
    });
    return total;
}

// Each headline stat is derived from its own source collection:
//   • active events            → events collection (status)
//   • revenue                  → registrations collection (actual amounts paid)
//   • registrations (count)    → registrations collection
//   • average rating           → reviews collection
function deriveDashboardStat(eventDocs: Docs, regDocs: Docs, reviewDocs: Docs) {
    let activeEvents = 0;
    eventDocs.forEach((doc) => {
        const status = (doc.data().status || "").toLowerCase();
        if (["active", "ongoing", "published", "registration_open"].includes(status)) {
            activeEvents++;
        }
    });

    // Revenue = sum of actual amounts paid across the registrations.
    const totalRevenue = computeRevenue(regDocs);

    // Registrations = live count of the organizer's registrations collection.
    const totalRegistrations = regDocs.length;

    // Average rating = mean of ratings stored in the reviews collection.
    let totalRating = 0;
    let ratedCount = 0;
    reviewDocs.forEach((doc) => {
        const rating = Number(doc.data().rating);
        if (rating > 0) {
            totalRating += rating;
            ratedCount++;
        }
    });
    const avgRating = ratedCount > 0
        ? parseFloat((totalRating / ratedCount).toFixed(1))
        : 0;

    return {
        activeEvents,
        registrations: totalRegistrations.toLocaleString("en-US"),
        revenue: formatCurrencyCompact(totalRevenue),
        avgRating,
    };
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
        // Live count when the caller has the registrations to hand. The
        // analytics.registrations fallback is only for callers that do not, and it
        // is a stale denormalised counter nothing in this codebase maintains — the
        // capacity meters on the dashboard were reading it.
        registeredCount: tallies?.get(doc.id)?.registrations ?? data.analytics?.registrations ?? 0,
        maxCapacity: data.capacity?.totalSeats ?? 0,
        status: DASHBOARD_STATUS_MAP[rawStatus] ?? "DRAFT",
    };
}

function deriveTodayEvents(eventDocs: Docs, organizerId: string, tallies?: Map<string, EventTally>): DashboardEvent[] {
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

function deriveUpcomingEvents(eventDocs: Docs, organizerId: string, tallies?: Map<string, EventTally>): DashboardEvent[] {
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

// Carries userId out so withAttendeeNames can resolve the names the documents lack;
// it is stripped again there, so RecentRegistration itself is unchanged.
function deriveRecentReg(regDocs: Docs): (RecentRegistration & { userId: string })[] {
    const allDocs = regDocs.map((doc) => ({
        doc,
        createdAt: toDate(doc.data().createdAt),
    }));

    allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const statusMap: Record<string, RecentRegistration["status"]> = {
        confirmed: "CONFIRMED",
        checked_in: "CONFIRMED",
        attended: "CONFIRMED",
        pending: "PENDING",
        cancelled: "CANCELLED",
        no_show: "CANCELLED",
    };

    return allDocs.slice(0, 10).map(({ doc }) => {
        const data = doc.data();
        const rawStatus = (data.status || "pending").toLowerCase();
        return {
            id: doc.id,
            userId: String(data.userId || ""),
            attendeeName: data.attendeeName || data.userName || "",
            eventName: data.eventName || data.eventTitle || "—",
            amountPaid: data.payment?.amountPaid ?? data.finalPrice ?? 0,
            status: statusMap[rawStatus] ?? "PENDING",
        };
    });
}

/**
 * Fill in the names the registration documents do not carry.
 *
 * Live registrations store neither `attendeeName` nor `userName`, so every row on the
 * dashboard rendered as an em dash. One batched lookup resolves the ten on screen —
 * `getUsersByIds` chunks internally, so this is not an N+1.
 *
 * The denormalised `attendee` field arriving with public registration will cover new
 * rows, but it cannot retrofit documents already written, so this join is needed either
 * way and takes precedence only when the document has nothing of its own.
 */
async function withAttendeeNames(rows: (RecentRegistration & { userId: string })[]): Promise<RecentRegistration[]> {
    const missing = rows.filter((r) => !r.attendeeName && r.userId).map((r) => r.userId);
    const users = missing.length ? await UserService.getUsersByIds(missing) : new Map();

    return rows.map(({ userId, ...row }) => ({
        ...row,
        attendeeName: row.attendeeName || users.get(userId)?.profile?.fullName || "Unknown attendee",
    }));
}

function deriveRegTrend(regDocs: Docs): DailyRegistrationTrend[] {
    const now = new Date();
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const countMap: Record<string, number> = {};
    const dayKeys: string[] = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        countMap[key] = 0;
        dayKeys.push(key);
    }

    regDocs.forEach((doc) => {
        // toIsoString returns null for unparseable values; the old inline
        // coercion produced an Invalid Date and threw on .toISOString().
        const dateStr = toIsoString(doc.data().createdAt)?.slice(0, 10);
        if (dateStr && dateStr in countMap) countMap[dateStr]++;
    });

    return dayKeys.map((key) => {
        const d = new Date(key);
        return { day: dayNames[d.getUTCDay()], registrations: countMap[key] };
    });
}

function deriveTotalEvents(eventDocs: Docs): AnalyticsMetric {
    let draft = 0, published = 0, completed = 0;
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

// regDocs, not eventDocs. This summed event.analytics.revenue, a counter nothing
// writes, so the headline read Rs 0 no matter how much had actually been paid.
/**
 * What the organizer has actually committed to vendors.
 *
 * Only bookings that represent a real commitment count. A quote that has been
 * requested, sent or is still being negotiated is not money owed, and a cancelled
 * one is not money spent — including either would inflate costs and understate the
 * net figure below.
 *
 * Note the commission does NOT enter this: `vendorReceives = baseBudget -
 * commissionAmount`, so the platform's 15% comes out of the vendor's payout, not
 * out of the organizer's pocket. The organizer pays `payment.totalAmount` in full.
 */
const COMMITTED_BOOKING_STATUSES = new Set(["quote_accepted", "confirmed", "in_progress", "completed"]);

function vendorSpendByEvent(bookingDocs: Docs): Map<string, number> {
    const spend = new Map<string, number>();
    bookingDocs.forEach((doc) => {
        const data = doc.data();
        if (!COMMITTED_BOOKING_STATUSES.has(String(data.status || "").toLowerCase())) return;
        const amount = Number(data.payment?.totalAmount ?? data.quote?.vendorQuote?.totalAmount ?? 0) || 0;
        if (!amount) return;
        const eventId = data.eventId || "";
        spend.set(eventId, (spend.get(eventId) ?? 0) + amount);
    });
    return spend;
}

function totalVendorSpend(bookingDocs: Docs): number {
    let total = 0;
    vendorSpendByEvent(bookingDocs).forEach((v) => { total += v; });
    return total;
}

function deriveNetAfterVendorSpend(regDocs: Docs, bookingDocs: Docs): AnalyticsMetric {
    // Was `revenue * 0.7` with a helper reading "Estimated after platform fees" —
    // a 30% deduction matching nothing (the platform takes 15%, and takes it from
    // the vendor), while the organizer's largest real cost was ignored entirely.
    const totalRevenue = computeRevenue(regDocs);
    const spend = totalVendorSpend(bookingDocs);
    const net = totalRevenue - spend;
    return {
        value: formatCurrencyCompact(net),
        helper: spend > 0
            ? `${formatCurrencyCompact(spend)} committed to vendors`
            : "No vendor spend committed yet",
    };
}

// Same fix as deriveProfit: the money lives on the registrations, not on a
// denormalised field of the event. The per-event column and this total now come
// from one source and therefore agree.
function deriveTotalRevenue(regDocs: Docs, eventCount: number): AnalyticsMetric {
    const totalRevenue = computeRevenue(regDocs);
    const avg = eventCount > 0 ? Math.round(totalRevenue / eventCount) : 0;
    return {
        value: formatCurrencyCompact(totalRevenue),
        helper: `Avg: ${formatCurrencyCompact(avg)}/event`,
    };
}

function deriveAvgSatisfaction(regDocs: Docs): AnalyticsMetric {
    let total = 0;
    let count = 0;
    regDocs.forEach((doc) => {
        const r = doc.data().rating;
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

function deriveDailyRegistrations(regDocs: Docs): DailyAnalyticsRegistration[] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const countMap: Record<string, number> = {};
    regDocs.forEach((doc) => {
        const iso = toIsoString(doc.data().createdAt);
        if (iso && new Date(iso) >= thirtyDaysAgo) {
            const dateStr = iso.slice(0, 10);
            countMap[dateStr] = (countMap[dateStr] ?? 0) + 1;
        }
    });

    const results: DailyAnalyticsRegistration[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = formatDate(d);
        results.push({ label, registrations: countMap[key] ?? 0 });
    }

    const step = Math.floor(results.length / 8);
    return results.filter((_, idx) => idx % Math.max(step, 1) === 0).slice(0, 8);
}

/**
 * Live per-event tallies from the registrations collection.
 *
 * NOTHING in this codebase writes `event.analytics.*`. Grep it: there is not one
 * update, set or increment against that block anywhere. Whatever is in those
 * fields was put there by seeding or by the external system that also writes
 * registrations, and it has drifted ever since — which is why revenue reads as
 * zero on events that plainly have paid registrations.
 *
 * The event detail page already knew this and derived its own numbers from
 * `registerations`; this makes the same source available to every other screen so
 * an event cannot report one figure in a list and a different one on its own page.
 *
 * Costs no extra read: getAnalyticsData already fetches these documents.
 */
export interface EventTally {
    registrations: number;
    checkedIn: number;
    revenue: number;
    /** Mean of registration.rating for this event; 0 when nobody has rated it. */
    avgRating: number;
}

function tallyByEvent(regDocs: Docs): Map<string, EventTally> {
    const tallies = new Map<string, EventTally>();
    const ratings = new Map<string, { total: number; count: number }>();
    regDocs.forEach((doc) => {
        const data = doc.data();
        const eventId = data.eventId;
        if (!eventId) return;

        const status = String(data.status || "").toLowerCase();
        // A cancelled registration is not an attendee and its money is not revenue.
        if (status === "cancelled") return;

        const t = tallies.get(eventId) ?? { registrations: 0, checkedIn: 0, revenue: 0, avgRating: 0 };
        t.registrations += 1;
        if (status === "checked_in" || status === "attended") t.checkedIn += 1;
        // Same field chain computeRevenue uses, so the per-event figures sum to the
        // headline one instead of quietly disagreeing with it.
        t.revenue += Number(data.payment?.amountPaid ?? data.finalPrice ?? 0) || 0;
        tallies.set(eventId, t);

        // Same field and same guard deriveAvgSatisfaction uses for the headline
        // figure, so the per-event column is the headline broken down rather than a
        // second, differently-computed number.
        const rating = data.rating;
        if (typeof rating === "number" && rating > 0) {
            const agg = ratings.get(eventId) ?? { total: 0, count: 0 };
            agg.total += rating;
            agg.count += 1;
            ratings.set(eventId, agg);
        }
    });

    ratings.forEach((agg, eventId) => {
        const t = tallies.get(eventId);
        if (t && agg.count > 0) t.avgRating = Number((agg.total / agg.count).toFixed(1));
    });
    return tallies;
}

function deriveEventPerformance(eventDocs: Docs, regDocs: Docs, bookingDocs: Docs): AnalyticsEventPerformance[] {
    const tallies = tallyByEvent(regDocs);
    const spendByEvent = vendorSpendByEvent(bookingDocs);

    // Carry a numeric sort key alongside the formatted date so sorting stays
    // chronological (parsing the DD/MM/YYYY display string would be unreliable).
    const results = eventDocs.map((doc) => {
        const data = doc.data();
        const startTime = eventStart(data);
        const tally = tallies.get(doc.id) ?? { registrations: 0, checkedIn: 0, revenue: 0, avgRating: 0 };
        const revenue = tally.revenue;
        const row: AnalyticsEventPerformance = {
            id: doc.id,
            eventName: data.title || "Untitled Event",
            eventType: data.eventType
                ? data.eventType.charAt(0).toUpperCase() + data.eventType.slice(1)
                : "Event",
            date: formatDate(startTime),
            registrations: tally.registrations,
            vendorSpend: spendByEvent.get(doc.id) ?? 0,
            netAfterVendorSpend: revenue - (spendByEvent.get(doc.id) ?? 0),
            revenue,
            // Was data.analytics?.avgRating, which is not even a field on the
            // analytics block — so this column could only ever have been zero.
            avgSatisfaction: tally.avgRating,
        };
        return { row, sortMs: startTime.getTime() };
    });

    results.sort((a, b) => b.sortMs - a.sortMs);
    return results.map((r) => r.row).slice(0, 20);
}

function deriveDateRange(eventDocs: Docs): string {
    const now = new Date();
    const fmt = (d: Date) => formatDate(d);

    if (eventDocs.length === 0) {
        return formatDate(now);
    }

    // eventStart falls back to new Date(0) for a document with no schedule and no
    // legacy timestamp — which every draft here is — so the "earliest" event was
    // the epoch and the range rendered as "01/01/1970 – today".
    let earliest: Date | null = null;
    eventDocs.forEach((doc) => {
        const d = eventStart(doc.data());
        const ms = d.getTime();
        if (!Number.isFinite(ms) || ms <= 0) return;
        if (!earliest || d < earliest) earliest = d;
    });

    // Every event undated: the range is just today rather than a fabricated span.
    if (!earliest) return fmt(now);

    return `${fmt(earliest)} – ${fmt(now)}`;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function fetchEvents(organizerId: string): Promise<QuerySnapshot> {
    return adminDb.collection(COLLECTIONS.EVENTS).where("organizerId", "==", organizerId).get();
}

function fetchRegistrations(organizerId: string): Promise<QuerySnapshot> {
    return adminDb.collection(COLLECTIONS.REGISTRATIONS).where("organizerId", "==", organizerId).get();
}

function fetchOrganizerBookings(organizerId: string): Promise<QuerySnapshot> {
    return adminDb.collection(COLLECTIONS.BOOKINGS).where("organizerId", "==", organizerId).get();
}

function fetchReviews(organizerId: string): Promise<QuerySnapshot> {
    return adminDb.collection(COLLECTIONS.FEEDBACK).where("organizerId", "==", organizerId).get();
}


export const AnalyticsService = {

    // ── Consolidated reads (fetch each collection once, derive everything) ──────

    /** Dashboard: one events read + one registerations read feed all 5 widgets.
     *  cache()'d so independent <Suspense> regions on the dashboard can each
     *  await it while it still runs only once per request. */
    getDashboardData: cache(async (organizerId: string) => {
        const [eventsSnap, regsSnap, reviewsSnap] = await Promise.all([
            fetchEvents(organizerId),
            fetchRegistrations(organizerId),
            fetchReviews(organizerId),
        ]);
        const eventDocs = eventsSnap.docs;
        const regDocs = regsSnap.docs;
        const reviewDocs = reviewsSnap.docs;

        const tallies = tallyByEvent(regDocs);

        return {
            stats: deriveDashboardStat(eventDocs, regDocs, reviewDocs),
            todayEvents: deriveTodayEvents(eventDocs, organizerId, tallies),
            upcomingEvents: deriveUpcomingEvents(eventDocs, organizerId, tallies),
            recentReg: await withAttendeeNames(deriveRecentReg(regDocs)),
            regTrend: deriveRegTrend(regDocs),
        };
    }),

    /** Analytics page: one events read + one registerations read feed all 7 metrics. */
    async getAnalyticsData(organizerId: string) {
        const [eventsSnap, regsSnap, bookingsSnap] = await Promise.all([
            fetchEvents(organizerId),
            fetchRegistrations(organizerId),
            fetchOrganizerBookings(organizerId),
        ]);
        const eventDocs = eventsSnap.docs;
        const regDocs = regsSnap.docs;
        const bookingDocs = bookingsSnap.docs;

        return {
            totalEvents: deriveTotalEvents(eventDocs),
            profit: deriveNetAfterVendorSpend(regDocs, bookingDocs),
            totalRevenue: deriveTotalRevenue(regDocs, eventDocs.length),
            avgSatisfaction: deriveAvgSatisfaction(regDocs),
            dailyRegistrations: deriveDailyRegistrations(regDocs),
            eventPerformance: deriveEventPerformance(eventDocs, regDocs, bookingDocs),
            dateRange: deriveDateRange(eventDocs),
        };
    },

    // ── Individual methods (kept for other callers; each fetches then derives) ──

    async getDashboardStat(organizerId: string) {
        const [eventsSnap, regsSnap, reviewsSnap] = await Promise.all([
            fetchEvents(organizerId),
            fetchRegistrations(organizerId),
            fetchReviews(organizerId),
        ]);
        return deriveDashboardStat(eventsSnap.docs, regsSnap.docs, reviewsSnap.docs);
    },

    /** Profile headline stats, each computed from its source collection:
     *  events (counts + revenue), registrations (attendees), reviews (rating). */
    async getOrganizerProfileStats(organizerId: string) {
        const [eventsSnap, regsSnap, reviewsSnap] = await Promise.all([
            fetchEvents(organizerId),
            fetchRegistrations(organizerId),
            fetchReviews(organizerId),
        ]);
        const now = new Date();

        let publishedEvents = 0, completedEvents = 0, upcomingEvents = 0;
        eventsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const status = (data.status || "").toLowerCase();
            if (["published", "registration_open", "ongoing", "active"].includes(status)) publishedEvents++;
            else if (status === "completed") completedEvents++;
            if (eventStart(data) > now) upcomingEvents++;
        });

        // Revenue = sum of actual amounts paid across the registrations.
        const totalRevenue = computeRevenue(regsSnap.docs);

        let totalRating = 0, ratedCount = 0;
        reviewsSnap.docs.forEach((doc) => {
            const rating = Number(doc.data().rating);
            if (rating > 0) { totalRating += rating; ratedCount++; }
        });

        const totalEventsCreated = eventsSnap.size;
        const totalAttendees = regsSnap.size;

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
        return deriveRecentReg((await fetchRegistrations(organizerId)).docs);
    },

    async getRegTrend(organizerId: string): Promise<DailyRegistrationTrend[]> {
        return deriveRegTrend((await fetchRegistrations(organizerId)).docs);
    },

    async getAnalyticsTotalEvents(organizerId: string): Promise<AnalyticsMetric> {
        return deriveTotalEvents((await fetchEvents(organizerId)).docs);
    },

    async getAnalyticsProfit(organizerId: string): Promise<AnalyticsMetric> {
        const [regs, bookings] = await Promise.all([fetchRegistrations(organizerId), fetchOrganizerBookings(organizerId)]);
        return deriveNetAfterVendorSpend(regs.docs, bookings.docs);
    },

    async getAnalyticsTotalRevenue(organizerId: string): Promise<AnalyticsMetric> {
        const [evs, regs] = await Promise.all([fetchEvents(organizerId), fetchRegistrations(organizerId)]);
        return deriveTotalRevenue(regs.docs, evs.docs.length);
    },

    async getAnalyticsAvgSatisfaction(organizerId: string): Promise<AnalyticsMetric> {
        return deriveAvgSatisfaction((await fetchRegistrations(organizerId)).docs);
    },

    /**
     * Live registration / check-in / revenue counts per event, keyed by event id.
     *
     * For screens that hold event documents already and need real numbers beside
     * them. One registrations read, cache()'d so a page rendering several regions
     * pays for it once.
     */
    getEventTallies: cache(async (organizerId: string): Promise<Map<string, EventTally>> => {
        return tallyByEvent((await fetchRegistrations(organizerId)).docs);
    }),

    async getAnalyticsDailyRegistrations(organizerId: string): Promise<DailyAnalyticsRegistration[]> {
        return deriveDailyRegistrations((await fetchRegistrations(organizerId)).docs);
    },

    async getAnalyticsEventPerformance(organizerId: string): Promise<AnalyticsEventPerformance[]> {
        const [eventDocs, regDocs, bookingDocs] = await Promise.all([
            fetchEvents(organizerId), fetchRegistrations(organizerId), fetchOrganizerBookings(organizerId),
        ]);
        return deriveEventPerformance(eventDocs.docs, regDocs.docs, bookingDocs.docs);
    },

    async getAnalyticsDateRange(organizerId: string): Promise<string> {
        return deriveDateRange((await fetchEvents(organizerId)).docs);
    },

    async getTotalEvents(organizerId: string): Promise<number> {
        return (await fetchEvents(organizerId)).size;
    },
};
