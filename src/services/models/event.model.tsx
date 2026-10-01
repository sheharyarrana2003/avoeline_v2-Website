import { parseScheduleDateTime } from "@/src/lib/datetime";

// `category` and `eventType` are plain strings because the vocabulary lives in
// Postgres (`event_categories`) and an admin can add to it
// without a deploy. They used to be unions of four and five slugs, which the
// wizard had never once satisfied -- it wrote "Technology & Innovation" and
// "networking" -- so the types were describing a shape no document had.
//
// EventFormat below is a DIFFERENT concept: the `format` field, physical vs
// virtual vs hybrid. The spec's "EventFormat" (Seminar, Hackathon) is the
// `eventType` field. Do not conflate them.
export type EventFormat = 'physical' | 'virtual' | 'hybrid';
export type MeetingPlatform = 'Google Meet' | 'Zoom' | 'Microsoft Teams';
export type CertificateType = 'digital' | 'blockchain' | 'both';
export type EventStatus = 'draft' | 'published' | 'registration_open' | 'ongoing' | 'completed' | 'cancelled';
/**
 * The five access models. `hybrid` and `tiered` are new; the first three were
 * already stored, so existing documents keep working.
 *
 * Lives here rather than in src/features/access because it is the type of a
 * field on this document -- the feature imports it, not the other way round.
 */
export type EventVisibility = 'public' | 'private' | 'invite_only' | 'hybrid' | 'tiered';

/** Per-event access configuration, stored under `access`. */
export interface EventAccess {
  /** Tiers an attendee can hold on this event. */
  attendeeTiers: string[];
  /** Tiers gated behind the access code or guest list. Only used by `hybrid`. */
  gatedTiers: string[];
  /** Whether an attendee may choose their own tier when registering. */
  allowTierSelfSelect: boolean;
  /** Registrations wait as `pending` until the organizer approves or rejects. */
  requiresApproval: boolean;
  /** Once capacity is reached, later registrants join the waitlist. */
  waitlistEnabled: boolean;
}

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

export type CustomFieldType =
  | "dropdown"
  | "text"
  | "long_text"
  | "email"
  | "checkbox"
  | "checkboxes"
  | "radio"
  | "number"
  | "date"
  | "file"
  | "image";

export interface CustomFieldOption {
  fieldId: string;
  label: string;
  type: CustomFieldType | string;
  options: string[];
  required: boolean;
  /** Group events: ask once for the group, or once per member. */
  askOnce?: "group" | "member";
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
  purpose: string;
  start_time: string;
  end_time: string;
  /*
   * The create form has always asked for these five and `createNewSpeaker`
   * always threw them away, so an organizer's typing was silently lost. They
   * are optional because every speaker stored before this carries none of them.
   * `isContactPublic` is the speaker's own answer about their details being
   * shown, and is recorded rather than assumed either way.
   */
  email?: string;
  phone?: string;
  isContactPublic?: boolean;
  linkedin?: string;
  twitter?: string;
  /** Required by the create form, and until now not read from it at all. */
  company?: string;
  website?: string;
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
  /** Attendee tiers this session is for. Empty or absent means everyone. */
  tiers?: string[];
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
  category: string;
  eventType: string;
  format: EventFormat;
  /** Document ids in super_categories / event_formats. The names above are
   *  denormalized copies, so a deactivated category still renders on old
   *  events without a lookup. */
  superCategoryId: string;
  eventFormatId: string;
  categorySuperId?: string;
  categoryFormatId?: string;
  /** Answers to the super-category's extra fields, keyed by CustomFieldOption.fieldId. */
  categoryFields: Record<string, string | number | boolean>;
  customFieldValues?: Record<string, any>;
  /** The starter checklist resolved from the category + format templates. */
  checklist: { label: string; done: boolean }[];
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
    groupRegistration?: boolean;
    groupMinSize?: number;
    groupMaxSize?: number;
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
  accessType: "public" | "private" | "invite_only" | "hybrid" | "vip_tiered";
  whitelistEmails: string[];
  accessCode: string | null;
  capacityCount?: number;
  waitlistEnabled: boolean;
  approvalRequired: boolean;
  access: EventAccess;
  /**
   * Sponsorship tier names, most significant first. Order is meaning: the public
   * sponsor strip sizes logos by position, so reordering is how an organizer
   * changes who shows largest. Editable per event, per the spec.
   */
  sponsorTiers: string[];
  analytics: EventAnalytics;
  createdAt: Date|string;
  updatedAt: Date|string;
  publishedAt: Date |string| null;
  archivedAt: Date |string| null;
  deletedAt: Date |string| null;   
  PriceOfTicket : number;
  mapUrl: string;
  requiresRegistration: boolean;

  constructor(raw: any) {
    this.id = String(raw.id || raw.event_id || raw.eventId || "").trim();
    this.organizerId = raw.organizerId || raw.organizer_id || "";
    this.title = raw.title || "Untitled Event";
    this.description = raw.description || "";
    this.shortDescription = raw.shortDescription || raw.short_description || "";
    this.category = raw.category || "";
    this.eventType = raw.eventType || raw.event_type || "";
    this.format = raw.format || "physical";
    // create_event does set({...instance}), so a field missing an assignment
    // here is silently dropped on write -- no type error, no runtime error,
    // just absent data. Add to the declaration AND to this constructor.
    this.superCategoryId = raw.superCategoryId || raw.categorySuperId || raw.super_category_id || "";
    this.eventFormatId = raw.eventFormatId || raw.categoryFormatId || raw.event_format_id || "";
    this.categorySuperId = raw.categorySuperId || raw.superCategoryId || "";
    this.categoryFormatId = raw.categoryFormatId || raw.eventFormatId || "";
    this.categoryFields = raw.categoryFields && typeof raw.categoryFields === "object" ? raw.categoryFields : (raw.customFieldValues || {});
    this.customFieldValues = raw.customFieldValues && typeof raw.customFieldValues === "object" ? raw.customFieldValues : (raw.categoryFields || {});
    this.checklist = Array.isArray(raw.checklist)
      ? (raw.checklist as { label?: unknown; done?: unknown }[])
          .filter((c) => c?.label)
          .map((c) => ({ label: String(c.label), done: !!c.done }))
      : [];
    this.language = raw.language || "en"; 
    this.PriceOfTicket = raw?.PriceOfTicket || 0;
    this.mapUrl = raw.mapUrl || raw.map_url || "";
    this.requiresRegistration = raw.requiresRegistration !== false && raw.requires_registration !== false;

    this.schedule = {
      startDate: raw.schedule?.startDate || raw.start_date || "",
      endDate: raw.schedule?.endDate || raw.end_date || "",
      startTime: raw.schedule?.startTime || raw.start_time || "",
      endTime: raw.schedule?.endTime || raw.end_time || "",
      timezone: raw.schedule?.timezone || raw.timezone || "UTC",
      isRecurring: !!(raw.schedule?.isRecurring ?? raw.is_recurring),
      recurrencePattern: raw.schedule?.recurrencePattern || raw.recurrence_pattern || null,
    };

    this.location = {
      venueName: raw.location?.venueName || raw.venue_name || "",
      address: raw.location?.address || raw.address || "",
      city: raw.location?.city || raw.city || "",
      country: raw.location?.country || raw.country || "",
      coordinates: {
        latitude: raw.location?.coordinates?.latitude ?? raw.coordinates?.lat ?? 0,
        longitude: raw.location?.coordinates?.longitude ?? raw.coordinates?.lng ?? 0,
      },
      meetingPlatform: raw.location?.meetingPlatform || raw.meeting_platform || null,
      meetingLink: raw.location?.meetingLink || raw.meeting_link || null,
      meetingId: raw.location?.meetingId || raw.meeting_id || null,
      meetingPassword: raw.location?.meetingPassword || raw.meeting_password || null,
       parkingInfo: raw.location?.parkingInfo || "",
      accessibilityInfo: raw.location?.accessibilityInfo || "",
      nearbyHotels: Array.isArray(raw.location?.nearbyHotels) ? raw.location.nearbyHotels : [],
      nearbyRestaurants: Array.isArray(raw.location?.nearbyRestaurants) ? raw.location.nearbyRestaurants : [],
    };

    this.bannerImage = raw.bannerImage || raw.banner_image || "";
    this.galleryImages = Array.isArray(raw.galleryImages) ? raw.galleryImages : (raw.gallery_images || []);
    this.promoVideoUrl = raw.promoVideoUrl || raw.promo_video_url || "";

    this.capacity = {
      totalSeats: raw.capacity?.totalSeats ?? raw.total_seats ?? 0,
      reservedSeats: raw.capacity?.reservedSeats ?? raw.reserved_seats ?? 0,
      availableSeats: raw.capacity?.availableSeats ?? raw.available_seats ?? 0,

      waitingListEnabled: !!(raw.capacity?.waitingListEnabled ?? raw.waitlist_enabled),
      waitingListCapacity: raw.capacity?.waitingListCapacity ?? raw.waitlist_capacity ?? 0,
      maxRegistrationsPerUser: raw.capacity?.maxRegistrationsPerUser ?? raw.max_registrations_per_user ?? 1,
    };

    this.registration = {
      registrationOpenDate: raw.registration?.registrationOpenDate || raw.registration_open_date || "",
      registrationCloseDate: raw.registration?.registrationCloseDate || raw.registration_close_date || "",
      requiresApproval: !!(raw.registration?.requiresApproval ?? raw.requires_approval),
      customForm: Array.isArray(raw.registration?.customForm)
        ? raw.registration.customForm
        : (raw.custom_form || []),

      earlyBirdDeadline: raw.registration?.earlyBirdDeadline || "",
      groupRegistrationEnabled: !!(
        raw.registration?.groupRegistration ??
        raw.groupRegistration ??
        raw.registration?.groupRegistrationEnabled
      ),
      groupRegistration: !!(
        raw.registration?.groupRegistration ??
        raw.groupRegistration ??
        raw.registration?.groupRegistrationEnabled
      ),
      groupMinSize: Number(raw.registration?.groupMinSize ?? raw.groupMinSize ?? 2) || 2,
      groupMaxSize: Number(raw.registration?.groupMaxSize ?? raw.groupMaxSize ?? 8) || 8,
      groupDiscountEnabled: !!raw.registration?.groupDiscountEnabled,
    };

    this.pricing = {
      isFree: !!(raw.pricing?.isFree ?? raw.is_free),
      currency: raw.pricing?.currency || raw.currency || "PKR",
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
      tiers: Array.isArray(item.tiers) ? item.tiers.map(String) : [],
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

    // Normalised, not raw. `statusMeta` lowercases and underscores before it looks a
    // status up, so a document holding "Published" or "Registration Open" renders a
    // perfectly correct badge — while every `status === "published"` comparison in
    // the app misses it. That mismatch put such events in the All tab and no other,
    // and left the per-status counts not adding up to the total. Normalising here
    // fixes it once for every consumer instead of at each comparison.
    this.status = (String(raw.status || "draft").toLowerCase().replace(/\s+/g, "_")) as EventStatus;
    const rawAccess = raw.accessType || (raw.visibility === "tiered" ? "vip_tiered" : raw.visibility) || "public";
    this.accessType = rawAccess === "tiered" ? "vip_tiered" : rawAccess;
    this.visibility = (raw.visibility === "tiered" || this.accessType === "vip_tiered"
      ? "tiered"
      : (raw.visibility || this.accessType)) as EventVisibility;
    this.whitelistEmails = Array.isArray(raw.whitelistEmails)
      ? raw.whitelistEmails.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)
      : [];
    this.accessCode = (raw.accessCode || raw.access_code) ? String(raw.accessCode || raw.access_code).trim() : null;
    this.waitlistEnabled = raw.waitlistEnabled !== undefined ? Boolean(raw.waitlistEnabled) : (raw.access?.waitlistEnabled ?? !!raw.capacity?.waitingListEnabled);
    this.approvalRequired = raw.approvalRequired !== undefined ? Boolean(raw.approvalRequired) : (raw.access?.requiresApproval ?? !!raw.registration?.requiresApproval);
    this.capacityCount = typeof raw.capacity === "number" ? raw.capacity : (raw.capacity?.totalSeats ?? raw.totalSeats ?? 0);
    this.sponsorTiers = Array.isArray(raw.sponsorTiers) && raw.sponsorTiers.length
      ? raw.sponsorTiers.map(String)
      : ["Title", "Platinum", "Gold", "Silver", "In-Kind"];
    this.access = {
      attendeeTiers: Array.isArray(raw.access?.attendeeTiers) && raw.access.attendeeTiers.length
        ? raw.access.attendeeTiers.map(String)
        : ["General", "Premium", "VIP", "Speaker", "Sponsor"],
      gatedTiers: Array.isArray(raw.access?.gatedTiers) ? raw.access.gatedTiers.map(String) : [],
      allowTierSelfSelect: !!raw.access?.allowTierSelfSelect,
      // Falls back to the older top-level flag, which is where every event
      // created before this block stored the same setting.
      requiresApproval: raw.access?.requiresApproval ?? !!raw.registration?.requiresApproval,
      waitlistEnabled: raw.access?.waitlistEnabled ?? !!raw.capacity?.waitingListEnabled,
    };
    this.analytics = {
      views: raw.analytics?.views ?? raw.views ?? 0,
      registrations: raw.analytics?.registrations ?? raw.registrations_count ?? 0,
      checkIns: raw.analytics?.checkIns ?? raw.check_ins_count ?? 0,
      completionRate: raw.analytics?.completionRate ?? raw.completion_rate ?? 0,
      revenue: raw.analytics?.revenue ?? raw.revenue ?? 0,
    };

    this.createdAt = parseDate(raw.createdAt || raw.created_at);
    this.updatedAt = parseDate(raw.updatedAt || raw.updated_at);
    this.publishedAt = (raw.publishedAt || raw.published_at) ? parseDate(raw.publishedAt || raw.published_at) : null;
    this.archivedAt = (raw.archivedAt || raw.archived_at) ? parseOptionalDate(raw.archivedAt || raw.archived_at) : null;
    this.deletedAt = (raw.deletedAt || raw.deleted_at) ? parseOptionalDate(raw.deletedAt || raw.deleted_at) : null;   
  }

  static fromJson(json: any): EventModel {
    return new EventModel(json);
  }
  get registrationProgress(): number {
    if (!this.capacity.totalSeats) return 0;
    return (this.analytics.registrations / this.capacity.totalSeats) * 100;
  }

  // Derived from `schedule` (not stored). createdAt/updatedAt are timestamptz;
  // event start/end live in schedule as DD/MM/YYYY + 12h.
  get eventStartTime(): Date | null {
    return parseScheduleDateTime(this.schedule?.startDate, this.schedule?.startTime);
  }

  get eventEndTime(): Date | null {
    return parseScheduleDateTime(this.schedule?.endDate, this.schedule?.endTime);
  }

  get isPastEvent(): boolean {
    const end = this.eventEndTime;
    return end ? new Date() > end : false;
  }

  get formattedRevenue(): string {
    return `${this.pricing.currency} ${this.analytics.revenue.toLocaleString()}`;
  }

}



export interface CreateEventDTO {
  title: string;
  description: string;
  category: string;
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
  description: string;
}

export interface WizardTrackDraft {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  fee: number;
  discountPercent: number;
  discountNote: string;
  discountExpiresAt: string;
  policies: string;
  instructions: string;
    minTeamSize: number;
    maxTeamSize: number;
    kind: string;
    rulesText: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType | string;
  options?: string[];
  required: boolean;
  askOnce?: "group" | "member";
}

export interface EventFormData {
  // Step 1: Basic Info
  /** Display name of the chosen event format. Re-resolved from eventFormatId
   *  on the server -- what the client sends here is never trusted. */
  eventType: string;
  eventTitle: string;
  description: string;
  /** Display name of the chosen super category. Same caveat as eventType. */
  category: string;
  superCategoryId: string;
  eventFormatId: string;
  categorySuperId?: string;
  categoryFormatId?: string;
  categoryFields: Record<string, string | number | boolean>;
  customFieldValues?: Record<string, any>;
  shortDescription: string;
  tags: string[];
  bannerImage: string | null;
  galleryImages: string[];
  videoUrl: string;

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
  mapUrl: string;
  meetingLink: string;
  totalSeats: number;
  reservedSeats: number;
  enableWaitingList: boolean;
  waitingListCapacity : number
  PriceOfTicket : number
  minSizeForGroupDiscounts : number;


  // Step 3: Registration & Tickets
  ticketType: 'free' | 'paid';
  ticketTiers: TicketTier[];
  studentDiscount: boolean;
  studentDiscountPercent: number;
  groupDiscount: boolean;
  groupDiscountPercent: number;
  groupRegistration: boolean;
  groupMinSize: number;
  groupMaxSize: number;
  isHackathon: boolean;
  promoCodes: string[];
  customFields: CustomField[];
  requiresRegistration: boolean;
  multiTrack: boolean;
  wizardTracks: WizardTrackDraft[];

  registrationOpenDate : string
  registrationCloseDate : string

  requiresApproval: boolean;
  maxTicketsPerPerson: number;

  // Step 4: Review & Publish
  visibility: 'public' | 'private' | 'invite_only';
  accessType?: 'public' | 'private' | 'invite_only' | 'hybrid' | 'vip_tiered';
  whitelistEmails?: string[];
  accessCode?: string;
  waitlistEnabled?: boolean;
  approvalRequired?: boolean;
  eventTiers?: Array<{ id?: string; name: string; description: string; order: number }>;
  gatedTiers?: string[];
  publishImmediately: boolean;
  agreeToTerms: boolean;
  confirmRights: boolean;
  isDraft: boolean;
}
