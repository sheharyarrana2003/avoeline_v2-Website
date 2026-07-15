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
export interface AgendaItem {
  sessionId: string;
  title: string;
  type: 'talk' | 'workshop' | 'panel' | 'networking' | 'break' | 'keynote' | 'qna' | 'registration' | 'closing';
  status: 'confirmed' | 'tentative' | 'cancelled' | 'completed';
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  timezone: string;
  location: string;
  room: string;
  building: string;
  floor: string;
  capacity: number;
  speakerNames: string[];
  description: string;
  activities: Array<{ time: string; description: string; type: string; requirements?: string[] }>;
  notes: string;
  recordingUrl: string;
  feedbackFormUrl: string;
  isRecordingAvailable: boolean;
  isRegistrationRequired: boolean;
  maxAttendees: number;
  currentAttendees: number;
  customFields: Record<string, any>;
}

export interface VendorRequirement {
  requirementId: string;
  serviceCategory: string;
  description: string;
  budget: number;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  assignedVendorId: string | null;
  requestedBy: string;
  requestedAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  notes: string;
}

export interface TeamMember {
  userId: string;
  role: string;
  permissions: string[];
  addedAt: Date;
  isActive: boolean;
}
export class EventModel {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  shortDescription: string;
  category: EventCategory;
  eventType: EventType;
  format: EventFormat;
  language: 'en' | 'ur'; 
  schedule: EventSchedule;
  location: EventLocation & { 
    parkingInfo?: string;
    accessibilityInfo?: string;
    nearbyHotels?: string[];
    nearbyRestaurants?: string[];
  };
  bannerImage: string;
  galleryImages: string[];
  promoVideoUrl: string;
  capacity: {
    totalSeats: number;
    reservedSeats: number;
    availableSeats: number;
    waitingListEnabled: boolean; 
    waitingListCapacity: number; 
    maxRegistrationsPerUser: number; 
  };
  registration: EventRegistration & { 
    earlyBirdDeadline?: string;
    groupRegistrationEnabled?: boolean;
    groupDiscountEnabled?: boolean;
  };
  pricing: EventPricing;
  speakers: Speaker[];
  agenda: AgendaItem[]; 
  vendorRequirements: VendorRequirement[]; 
  teamMembers: TeamMember[]; 
  certificateConfig: CertificateConfig;
  status: EventStatus;
  visibility: EventVisibility;
  accessCode: string | null;
  analytics: EventAnalytics;
  createdAt: Date|string;
  updatedAt: Date|string;
  publishedAt: Date |string| null;
  eventStartTime: Date|string;
  eventEndTime: Date|string;
  archivedAt: Date |string| null; 
  deletedAt: Date |string| null;   

  constructor(raw: any) {
    this.id = raw.eventId || raw.id || raw.event_id || "";
    this.organizerId = raw.organizerId || "";
    this.title = raw.title || "Untitled Event";
    this.description = raw.description || "";
    this.shortDescription = raw.shortDescription || "";
    this.category = raw.category || "technology";
    this.eventType = raw.eventType || "workshop";
    this.format = raw.format || "physical";
    this.language = raw.language || "en"; 

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
       parkingInfo: raw.location?.parkingInfo || "",
      accessibilityInfo: raw.location?.accessibilityInfo || "",
      nearbyHotels: Array.isArray(raw.location?.nearbyHotels) ? raw.location.nearbyHotels : [],
      nearbyRestaurants: Array.isArray(raw.location?.nearbyRestaurants) ? raw.location.nearbyRestaurants : [],
    };

    this.bannerImage = raw.bannerImage || "";
    this.galleryImages = Array.isArray(raw.galleryImages) ? raw.galleryImages : [];
    this.promoVideoUrl = raw.promoVideoUrl || "";

    this.capacity = {
      totalSeats: raw.capacity?.totalSeats ?? 0,
      reservedSeats: raw.capacity?.reservedSeats ?? 0,
      availableSeats: raw.capacity?.availableSeats ?? 0,

      waitingListEnabled: !!raw.capacity?.waitingListEnabled,
      waitingListCapacity: raw.capacity?.waitingListCapacity ?? 0,
      maxRegistrationsPerUser: raw.capacity?.maxRegistrationsPerUser ?? 1,
    };

    this.registration = {
      registrationOpenDate: raw.registration?.registrationOpenDate || "",
      registrationCloseDate: raw.registration?.registrationCloseDate || "",
      requiresApproval: !!raw.registration?.requiresApproval,
      customForm: Array.isArray(raw.registration?.customForm) ? raw.registration.customForm : [],

      earlyBirdDeadline: raw.registration?.earlyBirdDeadline || "",
      groupRegistrationEnabled: !!raw.registration?.groupRegistrationEnabled,
      groupDiscountEnabled: !!raw.registration?.groupDiscountEnabled,
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

    this.agenda = Array.isArray(raw.agenda) ? raw.agenda.map((item: any) => ({
      ...item,
      activities: Array.isArray(item.activities) ? item.activities : [],
      customFields: item.customFields || {},
    })) : [];

    const parseDate = (d: any) => d ? (d.toDate ? d.toDate() : new Date(d)) : new Date();
    const parseOptionalDate = (d: any) => d ? (d.toDate ? d.toDate() : new Date(d)) : null;

    this.vendorRequirements = Array.isArray(raw.vendorRequirements) ? raw.vendorRequirements.map((v: any) => ({
      ...v,
      requestedAt: parseDate(v.requestedAt),
      assignedAt: parseOptionalDate(v.assignedAt),
      completedAt: parseOptionalDate(v.completedAt),
    })) : [];

    this.teamMembers = Array.isArray(raw.teamMembers) ? raw.teamMembers.map((tm: any) => ({
      ...tm,
      addedAt: parseDate(tm.addedAt),
    })) : [];
    // ----------------------------

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

    this.createdAt = parseDate(raw.createdAt);
    this.updatedAt = parseDate(raw.updatedAt);
    this.publishedAt = raw.publishedAt ? parseDate(raw.publishedAt) : null;
    this.eventStartTime = parseDate(raw.eventStartTime);
    this.eventEndTime = parseDate(raw.eventEndTime);
    this.archivedAt = raw.archivedAt ? parseOptionalDate(raw.archivedAt) : null; 
    this.deletedAt = raw.deletedAt ? parseOptionalDate(raw.deletedAt) : null;   
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


// --- Types ---
export interface TicketTier {
  id: string;
  name: string;
  price: number;
  seatsAvailable: number;
  availableUntil: string;
  benefits: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'dropdown' | 'checkbox';
  options?: string[];
  required: boolean;
}

export interface EventFormData {
  // Step 1: Basic Info
  eventType: string;
  eventTitle: string;
  description: string;
  category: string;
  shortDescription: string;
  tags: string[];
  bannerImage: string | null;
  galleryImages: string[];
  videoUrl: string;
  dietaryOptions: string[];

  // Step 2: Schedule & Location
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timezone: string;
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'custom';
  locationType: 'physical' | 'virtual' | 'hybrid';
  venueName: string;
  address: string;
  city: string;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  totalSeats: number;
  reservedSeats: number;
  enableWaitingList: boolean;

  // Step 3: Registration & Tickets
  ticketType: 'free' | 'paid';
  ticketTiers: TicketTier[];
  studentDiscount: boolean;
  studentDiscountPercent: number;
  groupDiscount: boolean;
  groupDiscountPercent: number;
  promoCodes: string[];
  customFields: CustomField[];
  requiresApproval: boolean;
  maxTicketsPerPerson: number;

  // Step 4: Review & Publish
  visibility: 'public' | 'private' | 'invite_only';
  publishImmediately: boolean;
  agreeToTerms: boolean;
  confirmRights: boolean;
}
