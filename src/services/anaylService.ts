import { DashboardEvent, RecentRegistration, DailyRegistrationTrend } from "@/src/features/dashboard/types";
import {
    AnalyticsEventPerformance,
    AnalyticsMetric,
    DailyAnalyticsRegistration
} from "@/src/features/analytics/types";
//! hardcoded data



export const AnalyticsService = {

    async getDashboardStat(organizerId: string) {
        void organizerId;

        return {
            activeEvents: 15,
            registrations: "1,247",
            revenue: "PKR 8450k",
            avgRating: 4.8
        };
    },

    async getTodayEvents(organizerId: string) {
        void organizerId;

        const now = new Date();

        const getTodayAt = (hours: number, minutes: number) => {
            const d = new Date(now);
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        const getFutureDate = (daysAhead: number) => {
            const d = new Date(now);
            d.setDate(d.getDate() + daysAhead);
            return d;
        };

        const e: DashboardEvent[] = [
            {
                id: "evt_001",
                organizerId: "U001", // Linked to Dr. Sarah Khan (or your test user)
                title: "TechVerse Hackathon Opening",
                startDate: getTodayAt(9, 0),
                endDate: getTodayAt(12, 0),
                location: "Main Hall & Discord Server",
                registeredCount: 385,
                maxCapacity: 500,
                status: "ACTIVE"
            },
            {
                id: "evt_002",
                organizerId: "U001",
                title: "Generative AI Workshop",
                startDate: getTodayAt(14, 30),
                endDate: getTodayAt(16, 30),
                location: "Conference Room B",
                registeredCount: 84,
                maxCapacity: 100,
                status: "ACTIVE"
            },
            {
                id: "evt_003",
                organizerId: "U001",
                title: "Product Launch '26",
                startDate: getFutureDate(12),
                endDate: getFutureDate(14),
                location: "London, UK",
                registeredCount: 385,
                maxCapacity: 500,
                status: "PUBLISHED"
            }
        ]
        return e;

    },

    async getUpcomingEvents(organizerId: string) {
        const now = new Date();

        const getFutureDate = (daysAhead: number) => {
            const d = new Date(now);
            d.setDate(d.getDate() + daysAhead);
            return d;
        };

        const events: DashboardEvent[] = [
            {
                id: "evt_003",
                organizerId,
                title: "Product Launch '26",
                startDate: getFutureDate(12),
                endDate: getFutureDate(14),
                location: "London, UK",
                registeredCount: 385,
                maxCapacity: 500,
                status: "PUBLISHED"
            },
            {
                id: "evt_004",
                organizerId,
                title: "Web3 Summit",
                startDate: getFutureDate(28),
                endDate: getFutureDate(29),
                location: "Conference Room B",
                registeredCount: 124,
                maxCapacity: 500,
                status: "REGISTERATION_OPEN"
            }
        ];

        return events;
    },

    async getRecentReg(organizerId: string) {
        void organizerId;

        const recentRegistrations: RecentRegistration[] = [
            { id: "reg_1", attendeeName: "Arsalan Shah", eventName: "TechVerse Hack", amountPaid: 2500, status: "CONFIRMED" },
            { id: "reg_2", attendeeName: "Fatima Zahra", eventName: "AI Workshop", amountPaid: 5000, status: "CONFIRMED" },
            { id: "reg_3", attendeeName: "Zayn Malik", eventName: "UI/UX Bootcamp", amountPaid: 1200, status: "PENDING" },
            { id: "reg_4", attendeeName: "Hina Altaf", eventName: "TechVerse Hack", amountPaid: 2500, status: "CONFIRMED" },
        ];

        return recentRegistrations;
    },

    async getRegTrend(organizerId: string) {
        void organizerId;

        const weeklyTrends: DailyRegistrationTrend[] = [
            { day: "MON", registrations: 12 },
            { day: "TUE", registrations: 18 },
            { day: "WED", registrations: 15 },
            { day: "THU", registrations: 45 },
            { day: "FRI", registrations: 22 },
            { day: "SAT", registrations: 10 },
            { day: "SUN", registrations: 5 },
        ];

        return weeklyTrends;
    },
    async getAnalyticsTotalEvents(organizerId: string): Promise<AnalyticsMetric> {
        void organizerId;

        return {
            value: "24",
            helper: "8 draft, 12 published, 4 completed"
        };
    },

    async getAnalyticsProfit(organizerId: string): Promise<AnalyticsMetric> {
        void organizerId;

        return {
            value: "PKR 1.7M",
            helper: "+9.4% from last month"
        };
    },

    async getAnalyticsTotalRevenue(organizerId: string): Promise<AnalyticsMetric> {
        void organizerId;

        return {
            value: "PKR 4.2M",
            helper: "Avg: PKR 175k/event"
        };
    },

    async getAnalyticsAvgSatisfaction(organizerId: string): Promise<AnalyticsMetric> {
        void organizerId;

        return {
            value: "4.7",
            helper: "+0.2 from last month"
        };
    },

    async getAnalyticsDailyRegistrations(organizerId: string): Promise<DailyAnalyticsRegistration[]> {
        void organizerId;

        return [
            { label: "Mar 01", registrations: 340 },
            { label: "Mar 05", registrations: 430 },
            { label: "Mar 09", registrations: 390 },
            { label: "Mar 13", registrations: 690 },
            { label: "Mar 17", registrations: 1120 },
            { label: "Mar 21", registrations: 910 },
            { label: "Mar 25", registrations: 420 },
            { label: "Mar 31", registrations: 980 },
        ];
    },

    async getAnalyticsEventPerformance(organizerId: string): Promise<AnalyticsEventPerformance[]> {
        void organizerId;

        return [
            {
                id: "evt_tech_nexus",
                eventName: "Tech Nexus 2026",
                eventType: "Conference",
                date: "Mar 12, 2026",
                registrations: 1204,
                profit: 890000,
                revenue: 2400000,
                avgSatisfaction: 4.8
            },
            {
                id: "evt_urban_beats",
                eventName: "Urban Beats Night",
                eventType: "Concert",
                date: "Mar 18, 2026",
                registrations: 842,
                profit: 460000,
                revenue: 1100000,
                avgSatisfaction: 4.5
            },
            {
                id: "evt_ai_workshop",
                eventName: "Generative AI Workshop",
                eventType: "Workshop",
                date: "Mar 24, 2026",
                registrations: 516,
                profit: 210000,
                revenue: 680000,
                avgSatisfaction: 4.6
            },
        ];
    },

    async getTotalEvents(organizerId: string) {
        void organizerId;

        return 15;
    }
}
