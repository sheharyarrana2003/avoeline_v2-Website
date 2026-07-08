import {
    AnalyticsEventPerformance,
    AnalyticsMetric,
    DailyAnalyticsRegistration,
} from "@/src/features/analytics/types";
import { DashboardEvent, RecentRegistration, DailyRegistrationTrend } from "@/src/features/dashboard/types";
import { adminDb } from "@/data/admin_db";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── AnalyticsService ─────────────────────────────────────────────────────────

export const AnalyticsService = {

    // ── Dashboard Stats ───────────────────────────────────────────────────────

    async getDashboardStat(organizerId: string) {
        const eventsSnap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        let activeEvents = 0;
        let totalRevenue = 0;
        let totalRating = 0;
        let ratedEventCount = 0;
        let totalRegistrations = 0;

        eventsSnap.forEach((doc) => {
            const data = doc.data();
            const status = (data.status || "").toLowerCase();
            if (["active", "ongoing", "published", "registration_open"].includes(status)) {
                activeEvents++;
            }
            const rev = data.analytics?.revenue ?? 0;
            totalRevenue += rev;
            const regs = data.analytics?.registrations ?? 0;
            totalRegistrations += regs;
            if (data.analytics?.avgRating) {
                totalRating += data.analytics.avgRating;
                ratedEventCount++;
            }
        });

        const avgRating = ratedEventCount > 0
            ? parseFloat((totalRating / ratedEventCount).toFixed(1))
            : 0;

        return {
            activeEvents,
            registrations: totalRegistrations.toLocaleString("en-US"),
            revenue: formatCurrency(totalRevenue),
            avgRating,
        };
    },

    // ── Today's Events ────────────────────────────────────────────────────────

    async getTodayEvents(organizerId: string): Promise<DashboardEvent[]> {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        const results: DashboardEvent[] = [];
        snap.forEach((doc) => {
            const data = doc.data();
            const start = toDate(data.eventStartTime);
            const end = toDate(data.eventEndTime);
            // Show events that are happening today (overlaps with today's window)
            if (start <= todayEnd && end >= todayStart) {
                const rawStatus = (data.status || "draft").toUpperCase();
                const statusMap: Record<string, DashboardEvent["status"]> = {
                    DRAFT: "DRAFT",
                    PUBLISHED: "PUBLISHED",
                    REGISTRATION_OPEN: "REGISTERATION_OPEN",
                    ONGOING: "ACTIVE",
                    COMPLETED: "COMPLETED",
                    CANCELLED: "CANCELLED",
                };
                results.push({
                    id: doc.id,
                    organizerId: data.organizerId || organizerId,
                    title: data.title || "Untitled Event",
                    startDate: start,
                    endDate: end,
                    location: data.location?.venueName || data.location?.city || "—",
                    registeredCount: data.analytics?.registrations ?? 0,
                    maxCapacity: data.capacity?.totalSeats ?? 0,
                    status: statusMap[rawStatus] ?? "DRAFT",
                });
            }
        });

        return results;
    },

    // ── Upcoming Events ───────────────────────────────────────────────────────

    async getUpcomingEvents(organizerId: string): Promise<DashboardEvent[]> {
        const now = new Date();

        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        const results: DashboardEvent[] = [];
        snap.forEach((doc) => {
            const data = doc.data();
            const start = toDate(data.eventStartTime);
            if (start > now) {
                const rawStatus = (data.status || "draft").toUpperCase();
                const statusMap: Record<string, DashboardEvent["status"]> = {
                    DRAFT: "DRAFT",
                    PUBLISHED: "PUBLISHED",
                    REGISTRATION_OPEN: "REGISTERATION_OPEN",
                    ONGOING: "ACTIVE",
                    COMPLETED: "COMPLETED",
                    CANCELLED: "CANCELLED",
                };
                results.push({
                    id: doc.id,
                    organizerId: data.organizerId || organizerId,
                    title: data.title || "Untitled Event",
                    startDate: start,
                    endDate: toDate(data.eventEndTime),
                    location: data.location?.venueName || data.location?.city || "—",
                    registeredCount: data.analytics?.registrations ?? 0,
                    maxCapacity: data.capacity?.totalSeats ?? 0,
                    status: statusMap[rawStatus] ?? "DRAFT",
                });
            }
        });

        // Sort ascending by start date, show the nearest first
        results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        return results.slice(0, 5);
    },

    // ── Recent Registrations ──────────────────────────────────────────────────

    async getRecentReg(organizerId: string): Promise<RecentRegistration[]> {
        // No orderBy — avoids composite index requirement; sort in memory
        const snap = await adminDb
            .collection("registerations")
            .where("organizerId", "==", organizerId)
            .get();

        const allDocs: { doc: FirebaseFirestore.QueryDocumentSnapshot; createdAt: Date }[] = [];
        snap.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt
                ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date(data.createdAt))
                : new Date(0);
            allDocs.push({ doc, createdAt });
        });

        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const results: RecentRegistration[] = allDocs.slice(0, 10).map(({ doc }) => {
            const data = doc.data();
            const rawStatus = (data.status || "pending").toLowerCase();
            const statusMap: Record<string, RecentRegistration["status"]> = {
                confirmed: "CONFIRMED",
                checked_in: "CONFIRMED",
                attended: "CONFIRMED",
                pending: "PENDING",
                cancelled: "CANCELLED",
                no_show: "CANCELLED",
            };
            return {
                id: doc.id,
                attendeeName: data.attendeeName || data.userName || "—",
                eventName: data.eventName || data.eventTitle || "—",
                amountPaid: data.payment?.amountPaid ?? data.finalPrice ?? 0,
                status: statusMap[rawStatus] ?? "PENDING",
            };
        });

        return results;
    },




    async getRegTrend(organizerId: string): Promise<DailyRegistrationTrend[]> {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Single-field where only — no composite index needed; date filter in memory
        const snap = await adminDb
            .collection("registerations")
            .where("organizerId", "==", organizerId)
            .get();

        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        // Build a map for the last 7 days
        const countMap: Record<string, number> = {};
        const dayKeys: string[] = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
            countMap[key] = 0;
            dayKeys.push(key);
        }

        snap.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt;
            let dateStr = "";
            if (createdAt) {
                const d = typeof createdAt.toDate === "function"
                    ? createdAt.toDate()
                    : new Date(createdAt);
                dateStr = d.toISOString().slice(0, 10);
            }
            if (dateStr in countMap) {
                countMap[dateStr]++;
            }
        });

        return dayKeys.map((key) => {
            const d = new Date(key);
            return {
                day: dayNames[d.getUTCDay()],
                registrations: countMap[key],
            };
        });
    },

    // ── Analytics Page — Metrics ───────────────────────────────────────────────

    async getAnalyticsTotalEvents(organizerId: string): Promise<AnalyticsMetric> {
        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        let draft = 0, published = 0, completed = 0;
        snap.forEach((doc) => {
            const s = (doc.data().status || "").toLowerCase();
            if (s === "draft") draft++;
            else if (["published", "registration_open", "ongoing", "active"].includes(s)) published++;
            else if (s === "completed") completed++;
        });

        const total = snap.size;
        return {
            value: String(total),
            helper: `${draft} draft, ${published} published, ${completed} completed`,
        };
    },

    async getAnalyticsProfit(organizerId: string): Promise<AnalyticsMetric> {
        const eventsSnap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        let totalRevenue = 0;
        eventsSnap.forEach((doc) => {
            totalRevenue += doc.data().analytics?.revenue ?? 0;
        });

        // Profit = revenue – vendor costs
        const vendorSnap = await adminDb
            .collection("registerations")
            .where("organizerId", "==", organizerId)
            .get();

        // Simple proxy: profit ≈ 70 % of revenue (platform fee placeholder until a costs collection exists)
        const estimatedProfit = Math.round(totalRevenue * 0.7);

        return {
            value: formatCurrency(estimatedProfit),
            helper: "Estimated after platform fees",
        };
    },

    async getAnalyticsTotalRevenue(organizerId: string): Promise<AnalyticsMetric> {
        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        let totalRevenue = 0;
        let eventCount = 0;
        snap.forEach((doc) => {
            const rev = doc.data().analytics?.revenue ?? 0;
            totalRevenue += rev;
            eventCount++;
        });

        const avg = eventCount > 0 ? Math.round(totalRevenue / eventCount) : 0;
        return {
            value: formatCurrency(totalRevenue),
            helper: `Avg: ${formatCurrency(avg)}/event`,
        };
    },

    async getAnalyticsAvgSatisfaction(organizerId: string): Promise<AnalyticsMetric> {
        // Single-field where only — rating > 0 filter done in memory
        const snap = await adminDb
            .collection("registerations")
            .where("organizerId", "==", organizerId)
            .get();

        let total = 0;
        let count = 0;
        snap.forEach((doc) => {
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
    },

    // ── Analytics Page — Daily Registrations Chart ────────────────────────────

    async getAnalyticsDailyRegistrations(
        organizerId: string
    ): Promise<DailyAnalyticsRegistration[]> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const snap = await adminDb
            .collection("registerations")
            .where("organizerId", "==", organizerId)
            .get();

        // Build a map: YYYY-MM-DD → count
        const countMap: Record<string, number> = {};
        snap.forEach((doc) => {
            const data = doc.data();
            let dateStr = "";
            const createdAt = data.createdAt;
            if (createdAt) {
                const d = typeof createdAt.toDate === "function"
                    ? createdAt.toDate()
                    : new Date(createdAt);
                if (d >= thirtyDaysAgo) {
                    dateStr = d.toISOString().slice(0, 10);
                    countMap[dateStr] = (countMap[dateStr] ?? 0) + 1;
                }
            }
        });

        // Return one entry per day that had at least 1 registration (or all 30 days)
        const results: DailyAnalyticsRegistration[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
            results.push({ label, registrations: countMap[key] ?? 0 });
        }

        // Reduce to ~8 evenly-spaced points for the chart
        const step = Math.floor(results.length / 8);
        return results.filter((_, idx) => idx % Math.max(step, 1) === 0).slice(0, 8);
    },

    // ── Analytics Page — Event Performance Table ──────────────────────────────

    async getAnalyticsEventPerformance(
        organizerId: string
    ): Promise<AnalyticsEventPerformance[]> {
        // No orderBy — avoids composite index requirement; sort in memory
        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        const results: AnalyticsEventPerformance[] = [];
        snap.forEach((doc) => {
            const data = doc.data();
            const startTime = toDate(data.eventStartTime);
            const revenue = data.analytics?.revenue ?? 0;
            const profit = Math.round(revenue * 0.7);

            results.push({
                id: doc.id,
                eventName: data.title || "Untitled Event",
                eventType: data.eventType
                    ? data.eventType.charAt(0).toUpperCase() + data.eventType.slice(1)
                    : "Event",
                date: startTime.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                }),
                registrations: data.analytics?.registrations ?? 0,
                profit,
                revenue,
                avgSatisfaction: data.analytics?.avgRating ?? 0,
            });
        });

        // Sort newest-first in memory
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return results.slice(0, 20);
    },

    // ── Analytics Page — Date Range label ────────────────────────────────────

    async getAnalyticsDateRange(organizerId: string): Promise<string> {
        // No orderBy — fetch all, find earliest in memory
        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();

        if (snap.empty) {
            const now = new Date();
            return now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }

        let earliest: Date | null = null;
        snap.forEach((doc) => {
            const d = toDate(doc.data().eventStartTime);
            if (!earliest || d < earliest) earliest = d;
        });

        const now = new Date();
        const fmt = (d: Date) =>
            d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

        return `${fmt(earliest!)} – ${fmt(now)}`;
    },

    // ── Legacy helper (used by dashboard redirect count) ─────────────────────

    async getTotalEvents(organizerId: string): Promise<number> {
        const snap = await adminDb
            .collection("events")
            .where("organizerId", "==", organizerId)
            .get();
        return snap.size;
    },
};
