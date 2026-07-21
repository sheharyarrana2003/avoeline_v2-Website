
export interface EventFeedback {
    id?: string; // Firestore Document ID
    feedbackId?: string;
    targetId: string;
    targetType: "event" | string;
    type: "event" | string;
    
    // Reviewer & User info
    reviewerId: string;
    reviewerType: "attendee" | "organizer" | string;
    userId?: string;
    
    // Content
    title: string;
    comment: string;
    rating: number; // e.g. 3.8
    tags: string[]; // e.g. ["event_feedback"]
    
    // Attendance & Verification flags
    attendedEvent: boolean;
    usedService: boolean;
    verifiedPurchase: boolean;
    visibility: "public" | "private" | string;
    
    // Social / Interaction metrics
    helpfulCount: number;
    helpfulUserIds: string[];
    
    // Metadata / Timestamps (stored as ISO strings or Firestore Timestamps)
    createdAt: string | Date | any;
    updatedAt: string | Date | any;
}

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

export interface EventFeedbackAnalysisRow {
    eventId: string;
    eventName: string;
    feedbackCount: number;
    summary: string;
    strengths: string;
    improvements: string;
    sentiment: string;
}
