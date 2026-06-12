export interface AnalyticsMetric {
    value: string;
    helper?: string;
}

export interface DailyAnalyticsRegistration {
    label: string;
    registrations: number;
}

export interface AnalyticsEventPerformance {
    id: string;
    eventName: string;
    eventType: string;
    date: string;
    registrations: number;
    profit: number;
    revenue: number;
    avgSatisfaction: number;
}
