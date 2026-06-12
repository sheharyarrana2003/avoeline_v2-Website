export interface DashboardEvent {
    id: string;
    organizerId: string;
    title: string;
    // For today's schedule, you need exact times. For upcoming, you need dates.
    startDate: Date; 
    endDate: Date;
    location: string;
    
    // For the progress bars on the "Upcoming" card
    registeredCount: number;
    maxCapacity: number;
    
    // To determine if the "Live View" badge should pulse
    status: "DRAFT" | "PUBLISHED" | "REGISTERATION_OPEN" | 
          "ACTIVE" | "COMPLETED" | "CANCELLED"

}

export interface RecentRegistration {
    id: string;
    attendeeName: string;
    eventName: string;
    amountPaid: number;
    status: "CONFIRMED" | "PENDING" | "CANCELLED";
}

export interface DailyRegistrationTrend {
    day: string; // e.g., "MON", "TUE", "WED"
    registrations: number;
}