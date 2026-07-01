export type EventCategory = 'technology' | 'business' | 'healthcare' | 'education';
export type EventType = 'workshop' | 'conference' | 'seminar' | 'webinar' | 'hackathon';
export type EventFormat = 'physical' | 'virtual' | 'hybrid';
export type MeetingPlatform = 'Google Meet' | 'Zoom' | 'Microsoft Teams';
export type CertificateType = 'digital' | 'blockchain' | 'both';
export type EventStatus = 'draft' | 'published' | 'registration_open' | 'ongoing' | 'completed' | 'cancelled';
export type EventVisibility = 'public' | 'private' | 'invite_only';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EventSchedule {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'monthly' | null;
}

export interface EventLocation {
  // Physical Location
  venueName: string;
  address: string;
  city: string;
  country: string;
  coordinates: Coordinates;
  
  // Virtual Location
  meetingPlatform: MeetingPlatform | null;
  meetingLink: string | null;
  meetingId: string | null;
  meetingPassword: string | null;
}

export interface CustomFieldOption {
  fieldId: string;
  label: string;
  type: 'dropdown' | 'text' | 'checkbox'; // expanded for flexibility
  options: string[];
  required: boolean;
}

export interface EventRegistration {
  registrationOpenDate: string;
  registrationCloseDate: string;
  requiresApproval: boolean;
  customForm: CustomFieldOption[];
}

export interface PriceTier {
  name: string;
  price: number;
  availableUntil: string;
  seats: number;
}

export interface EventPricing {
  isFree: boolean;
  currency: string;
  tiers: PriceTier[];
  studentDiscount: {
    enabled: boolean;
    percentage: number;
    requiresVerification: boolean;
  };
  groupDiscount: {
    enabled: boolean;
    minGroupSize: number;
    percentage: number;
  };
}

export interface Speaker {
  speakerId: string;
  name: string;
  designation: string;
  bio: string;
  profileImage: string;
  sessionTitle: string;
}

export interface CertificateConfig {
  issueCertificates: boolean;
  certificateType: CertificateType;
  templateId: string;
  requirements: {
    minAttendance: number;
    mustCompleteSurvey: boolean;
  };
}

export interface EventAnalytics {
  views: number;
  registrations: number;
  checkIns: number;
  completionRate: number;
  revenue: number;
}

export class EventModel {
  eventId: string;
  organizerId: string;
  title: string;
  description: string;
  shortDescription: string;
  category: EventCategory;
  eventType: EventType;
  format: EventFormat;
  schedule: EventSchedule;
  location: EventLocation;
  bannerImage: string;
  galleryImages: string[];
  promoVideoUrl: string;
  capacity: { totalSeats: number; reservedSeats: number; availableSeats: number };
  registration: EventRegistration;
  pricing: EventPricing;
  speakers: Speaker[];
  certificateConfig: CertificateConfig;
  status: EventStatus;
  visibility: EventVisibility;
  accessCode: string | null;
  analytics: EventAnalytics;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  eventStartTime: Date;
  eventEndTime: Date;

  constructor(raw: any) {
    this.eventId = raw.eventId || "";
    this.organizerId = raw.organizerId || "";
    this.title = raw.title || "Untitled Event";
    this.description = raw.description || "";
    this.shortDescription = raw.shortDescription || "";
    this.category = raw.category || "technology";
    this.eventType = raw.eventType || "workshop";
    this.format = raw.format || "physical";
    
    this.schedule = {
      startDate: raw.schedule?.startDate || "",
      endDate: raw.schedule?.endDate || "",
      startTime: raw.schedule?.startTime || "",
      endTime: raw.schedule?.endTime || "",
      timezone: raw.schedule?.timezone || "UTC",
      isRecurring: !!raw.schedule?.isRecurring,
      recurrencePattern: raw.schedule?.recurrencePattern || null,
    };
    
    this.location = {
      venueName: raw.location?.venueName || "",
      address: raw.location?.address || "",
      city: raw.location?.city || "",
      country: raw.location?.country || "",
      coordinates: {
        latitude: raw.location?.coordinates?.latitude ?? 0,
        longitude: raw.location?.coordinates?.longitude ?? 0,
      },
      meetingPlatform: raw.location?.meetingPlatform || null,
      meetingLink: raw.location?.meetingLink || null,
      meetingId: raw.location?.meetingId || null,
      meetingPassword: raw.location?.meetingPassword || null,
    };
    
    this.bannerImage = raw.bannerImage || "";
    this.galleryImages = Array.isArray(raw.galleryImages) ? raw.galleryImages : [];
    this.promoVideoUrl = raw.promoVideoUrl || "";
    
    this.capacity = {
      totalSeats: raw.capacity?.totalSeats ?? 0,
      reservedSeats: raw.capacity?.reservedSeats ?? 0,
      availableSeats: raw.capacity?.availableSeats ?? 0,
    };
    
    this.registration = {
      registrationOpenDate: raw.registration?.registrationOpenDate || "",
      registrationCloseDate: raw.registration?.registrationCloseDate || "",
      requiresApproval: !!raw.registration?.requiresApproval,
      customForm: Array.isArray(raw.registration?.customForm) ? raw.registration.customForm : [],
    };
    
    this.pricing = {
      isFree: !!raw.pricing?.isFree,
      currency: raw.pricing?.currency || "PKR",
      tiers: Array.isArray(raw.pricing?.tiers) ? raw.pricing.tiers : [],
      studentDiscount: {
        enabled: !!raw.pricing?.studentDiscount?.enabled,
        percentage: raw.pricing?.studentDiscount?.percentage ?? 0,
        requiresVerification: !!raw.pricing?.studentDiscount?.requiresVerification,
      },
      groupDiscount: {
        enabled: !!raw.pricing?.groupDiscount?.enabled,
        minGroupSize: raw.pricing?.groupDiscount?.minGroupSize ?? 0,
        percentage: raw.pricing?.groupDiscount?.percentage ?? 0,
      }
    };
    
    this.speakers = Array.isArray(raw.speakers) ? raw.speakers : [];
    this.certificateConfig = {
      issueCertificates: !!raw.certificateConfig?.issueCertificates,
      certificateType: raw.certificateConfig?.certificateType || "digital",
      templateId: raw.certificateConfig?.templateId || "",
      requirements: {
        minAttendance: raw.certificateConfig?.requirements?.minAttendance ?? 0,
        mustCompleteSurvey: !!raw.certificateConfig?.requirements?.mustCompleteSurvey,
      }
    };
    
    this.status = raw.status || "draft";
    this.visibility = raw.visibility || "public";
    this.accessCode = raw.accessCode || null;
    this.analytics = {
      views: raw.analytics?.views ?? 0,
      registrations: raw.analytics?.registrations ?? 0,
      checkIns: raw.analytics?.checkIns ?? 0,
      completionRate: raw.analytics?.completionRate ?? 0,
      revenue: raw.analytics?.revenue ?? 0,
    };
    
    // Date parser helper logic built inside
    const parseDate = (d: any) => d ? (d.toDate ? d.toDate() : new Date(d)) : new Date();
    this.createdAt = parseDate(raw.createdAt);
    this.updatedAt = parseDate(raw.updatedAt);
    this.publishedAt = raw.publishedAt ? parseDate(raw.publishedAt) : null;
    this.eventStartTime = parseDate(raw.eventStartTime);
    this.eventEndTime = parseDate(raw.eventEndTime);
  }

  static fromJson(json: any): EventModel {
    return new EventModel(json);
  }
  get registrationProgress(): number {
    if (!this.capacity.totalSeats) return 0;
    return (this.analytics.registrations / this.capacity.totalSeats) * 100;
  }

  get isPastEvent(): boolean {
    return new Date() > this.eventEndTime;
  }

  get formattedRevenue(): string {
    return `${this.pricing.currency} ${this.analytics.revenue.toLocaleString()}`;
  }
}




export interface CreateEventDTO {
    title: string;
    description: string;
    category: EventCategory;
    date: string;
    time: string;
    location: string;
    capacity: number;
    ticketPrice: number;
    imageUrl?: string;
    tags?: string[];
}

export interface UpdateEventDTO extends Partial<CreateEventDTO> {
    status?: EventStatus;
}

export interface EventStats {
    totalEvents: number;
    activeEvents: number;
    totalRegistrations: number;
    totalRevenue: number;
    avgRating: number;
    publishedCount: number;
    draftCount: number;
    ongoingCount: number;
    completedCount: number;
    cancelledCount: number;
}