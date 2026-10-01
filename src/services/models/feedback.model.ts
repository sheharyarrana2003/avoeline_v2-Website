
export interface EventFeedback {
    id?: string; // Firestore Document ID
    feedbackId?: string;
    targetId: string;
    targetType: "event" | "vendor" | string;
    type: "event" | "vendor" | string;

    // Reviewer & User info
    reviewerId: string;
    reviewerType: "attendee" | "organizer" | string;
    userId?: string;
    /** Denormalized reviewer label so review lists don't need an extra read. */
    reviewerName?: string;

    // Scoping. `organizerId` exists on live docs and is queried directly
    // (FeedbackService.getFeedbackByOrganizer, anaylService.fetchReviews).
    // `bookingId` is set on vendor reviews and enforces one review per booking.
    organizerId?: string;
    bookingId?: string;
    eventId?: string;

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
    /**
     * Ticket revenue for this event minus what the organizer committed to vendors
     * on it. Named for what it is: the app knows vendor spend and nothing else, so
     * calling it `profit` invited exactly the misreading it used to produce, when
     * it was revenue x 0.7 with no costs in it at all.
     */
    netAfterVendorSpend: number;
    vendorSpend: number;
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
