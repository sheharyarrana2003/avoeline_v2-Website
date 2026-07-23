import { cache } from "react";
import {
    AnalyticsEventPerformance,
    AnalyticsMetric,
    DailyAnalyticsRegistration,
} from "@/src/services/models/feedback.model";
import { DashboardEvent, RecentRegistration, DailyRegistrationTrend } from "@/src/features/dashboard/types";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QueryDocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";
import { formatDate, parseScheduleDateTime } from "@/src/lib/datetime";


function formatCurrency(value: number): string {
    if (value >= 1_000_000) return `PKR ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `PKR ${(value / 1_000).toFixed(0)}k`;
    return `PKR ${value}`;
}

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

// Revenue, calculated directly from the events: for every event, its ticket
// price × the number of people registered for it (registrations counted from
// the registrations collection). Free events contribute nothing.
function computeRevenueFromEvents(eventDocs: Docs, regDocs: Docs): number {
    const regCountByEvent: Record<string, number> = {};
    regDocs.forEach((doc) => {
        const eventId = doc.data().eventId;
        if (eventId) regCountByEvent[eventId] = (regCountByEvent[eventId] ?? 0) + 1;
    });

    let total = 0;
    eventDocs.forEach((doc) => {
        const data = doc.data();
        if (data.pricing?.isFree) return;
        const ticketPrice = Number(data.PriceOfTicket) || Number(data.pricing?.tiers?.[0]?.price) || 0;
        total += ticketPrice * (regCountByEvent[doc.id] ?? 0);
    });
    return total;
}

// Each headline stat is derived from its own source collection:
//   • active events            → events collection (status)
//   • revenue                  → events collection (ticket price × registrations)
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

    // Revenue calculated from the events (price × registrations).
    const totalRevenue = computeRevenueFromEvents(eventDocs, regDocs);

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
        revenue: formatCurrency(totalRevenue),
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

function toDashboardEvent(doc: QueryDocumentSnapshot, organizerId: string): DashboardEvent {
    const data = doc.data();
    const rawStatus = (data.status || "draft").toUpperCase();
    return {
        id: doc.id,
        organizerId: data.organizerId || organizerId,
        title: data.title || "Untitled Event",
        startDate: eventStart(data),
        endDate: eventEnd(data),
        location: data.location?.venueName || data.location?.city || "—",
        registeredCount: data.analytics?.registrations ?? 0,
        maxCapacity: data.capacity?.totalSeats ?? 0,
        status: DASHBOARD_STATUS_MAP[rawStatus] ?? "DRAFT",
    };
}

function deriveTodayEvents(eventDocs: Docs, organizerId: string): DashboardEvent[] {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const results: DashboardEvent[] = [];
    eventDocs.forEach((doc) => {
        const data = doc.data();
        const start = eventStart(data);
        const end = eventEnd(data);
        if (start <= todayEnd && end >= todayStart) {
            results.push(toDashboardEvent(doc, organizerId));
        }
    });
    return results;
}

function deriveUpcomingEvents(eventDocs: Docs, organizerId: string): DashboardEvent[] {
    const now = new Date();
    const results: DashboardEvent[] = [];
    eventDocs.forEach((doc) => {
        const start = eventStart(doc.data());
        if (start > now) {
            results.push(toDashboardEvent(doc, organizerId));
        }
    });
    results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    return results.slice(0, 5);
}

function deriveRecentReg(regDocs: Docs): RecentRegistration[] {
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
            attendeeName: data.attendeeName || data.userName || "—",
            eventName: data.eventName || data.eventTitle || "—",
            amountPaid: data.payment?.amountPaid ?? data.finalPrice ?? 0,
            status: statusMap[rawStatus] ?? "PENDING",
        };
    });
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
        const createdAt = doc.data().createdAt;
        if (createdAt) {
            const d = typeof createdAt.toDate === "function" ? createdAt.toDate() : new Date(createdAt);
            const dateStr = d.toISOString().slice(0, 10);
            if (dateStr in countMap) countMap[dateStr]++;
        }
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

function deriveProfit(eventDocs: Docs): AnalyticsMetric {
    let totalRevenue = 0;
    eventDocs.forEach((doc) => {
        totalRevenue += doc.data().analytics?.revenue ?? 0;
    });
    // Simple proxy: profit ≈ 70 % of revenue (platform fee placeholder until a costs collection exists)
    const estimatedProfit = Math.round(totalRevenue * 0.7);
    return {
        value: formatCurrency(estimatedProfit),
        helper: "Estimated after platform fees",
    };
}

function deriveTotalRevenue(eventDocs: Docs): AnalyticsMetric {
    let totalRevenue = 0;
    eventDocs.forEach((doc) => {
        totalRevenue += doc.data().analytics?.revenue ?? 0;
    });
    const avg = eventDocs.length > 0 ? Math.round(totalRevenue / eventDocs.length) : 0;
    return {
        value: formatCurrency(totalRevenue),
        helper: `Avg: ${formatCurrency(avg)}/event`,
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
        const createdAt = doc.data().createdAt;
        if (createdAt) {
            const d = typeof createdAt.toDate === "function" ? createdAt.toDate() : new Date(createdAt);
            if (d >= thirtyDaysAgo) {
                const dateStr = d.toISOString().slice(0, 10);
                countMap[dateStr] = (countMap[dateStr] ?? 0) + 1;
            }
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

function deriveEventPerformance(eventDocs: Docs): AnalyticsEventPerformance[] {
    // Carry a numeric sort key alongside the formatted date so sorting stays
    // chronological (parsing the DD/MM/YYYY display string would be unreliable).
    const results = eventDocs.map((doc) => {
        const data = doc.data();
        const startTime = eventStart(data);
        const revenue = data.analytics?.revenue ?? 0;
        const row: AnalyticsEventPerformance = {
            id: doc.id,
            eventName: data.title || "Untitled Event",
            eventType: data.eventType
                ? data.eventType.charAt(0).toUpperCase() + data.eventType.slice(1)
                : "Event",
            date: formatDate(startTime),
            registrations: data.analytics?.registrations ?? 0,
            profit: Math.round(revenue * 0.7),
            revenue,
            avgSatisfaction: data.analytics?.avgRating ?? 0,
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

    let earliest: Date | null = null;
    eventDocs.forEach((doc) => {
        const d = eventStart(doc.data());
        if (!earliest || d < earliest) earliest = d;
    });

    return `${fmt(earliest!)} – ${fmt(now)}`;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function fetchEvents(organizerId: string): Promise<QuerySnapshot> {
    return adminDb.collection("events").where("organizerId", "==", organizerId).get();
}

function fetchRegistrations(organizerId: string): Promise<QuerySnapshot> {
    return adminDb.collection(COLLECTIONS.REGISTRATIONS).where("organizerId", "==", organizerId).get();
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

        return {
            stats: deriveDashboardStat(eventDocs, regDocs, reviewDocs),
            todayEvents: deriveTodayEvents(eventDocs, organizerId),
            upcomingEvents: deriveUpcomingEvents(eventDocs, organizerId),
            recentReg: deriveRecentReg(regDocs),
            regTrend: deriveRegTrend(regDocs),
        };
    }),

    /** Analytics page: one events read + one registerations read feed all 7 metrics. */
    async getAnalyticsData(organizerId: string) {
        const [eventsSnap, regsSnap] = await Promise.all([
            fetchEvents(organizerId),
            fetchRegistrations(organizerId),
        ]);
        const eventDocs = eventsSnap.docs;
        const regDocs = regsSnap.docs;

        return {
            totalEvents: deriveTotalEvents(eventDocs),
            profit: deriveProfit(eventDocs),
            totalRevenue: deriveTotalRevenue(eventDocs),
            avgSatisfaction: deriveAvgSatisfaction(regDocs),
            dailyRegistrations: deriveDailyRegistrations(regDocs),
            eventPerformance: deriveEventPerformance(eventDocs),
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

        // Revenue calculated from the events (ticket price × registrations).
        const totalRevenue = computeRevenueFromEvents(eventsSnap.docs, regsSnap.docs);

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
        return deriveProfit((await fetchEvents(organizerId)).docs);
    },

    async getAnalyticsTotalRevenue(organizerId: string): Promise<AnalyticsMetric> {
        return deriveTotalRevenue((await fetchEvents(organizerId)).docs);
    },

    async getAnalyticsAvgSatisfaction(organizerId: string): Promise<AnalyticsMetric> {
        return deriveAvgSatisfaction((await fetchRegistrations(organizerId)).docs);
    },

    async getAnalyticsDailyRegistrations(organizerId: string): Promise<DailyAnalyticsRegistration[]> {
        return deriveDailyRegistrations((await fetchRegistrations(organizerId)).docs);
    },

    async getAnalyticsEventPerformance(organizerId: string): Promise<AnalyticsEventPerformance[]> {
        return deriveEventPerformance((await fetchEvents(organizerId)).docs);
    },

    async getAnalyticsDateRange(organizerId: string): Promise<string> {
        return deriveDateRange((await fetchEvents(organizerId)).docs);
    },

    async getTotalEvents(organizerId: string): Promise<number> {
        return (await fetchEvents(organizerId)).size;
    },
};
