export interface DashboardEvent {
  id: string;
  organizerId: string;
  title: string;
  // For today's schedule, you need exact times. For upcoming, you need dates.
  startDate: Date;
  endDate: Date;
  location: string;
  /** Banner URL when available (upcoming list thumbs). */
  bannerUrl?: string | null;

  // For the progress bars on the "Upcoming" card
  registeredCount: number;
  maxCapacity: number;

  // To determine if the "Live View" badge should pulse
  status: "DRAFT" | "PUBLISHED" | "REGISTERATION_OPEN" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface RecentRegistrationMember {
  name: string;
  email: string;
}

export interface RecentRegistration {
  id: string;
  attendeeName: string;
  attendeeEmail?: string;
  eventId: string;
  eventName: string;
  eventBanner?: string | null;
  amountPaid: number;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  teamName?: string;
  competitionName?: string;
  memberCount?: number;
  members?: RecentRegistrationMember[];
  isTeam?: boolean;
  /** Attendees page (with ?team= when a hackathon team). */
  href: string;
}

export interface DailyRegistrationTrend {
  day: string; // e.g., "MON", "TUE", "WED"
  registrations: number;
}

export interface DashboardStats {
  activeEvents: number;
  /** Occupancy count, locale-formatted. */
  registrations: string;
  occupancyCount: number;
  peopleCount: number;
  teamsCount: number;
  revenue: string;
  /** null when there are no reviews — UI shows "—" not a fake 0. */
  avgRating: number | null;
}
