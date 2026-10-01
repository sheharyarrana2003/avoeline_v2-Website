import { cache } from "react";
import { EventFormData, EventModel } from "./models/event.model";
import { RecentRegistration } from '../features/dashboard/types';
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { formatDate, formatTime, toIsoDate } from "@/src/lib/datetime";
import { CertificateTemplateService } from "./certificate.template.services";
import { listTaxonomy } from "@/src/features/taxonomy/taxonomy.service";
import { missingRequired, resolveChecklist, selectable } from "@/src/features/taxonomy/types";
import { CategoryEngineService } from "@/src/features/taxonomy/categoryEngine.service";
import { seedEventTasksFromTemplate } from "@/src/features/taxonomy/actions/categoryEngine.action";
import { parseHackathonKind } from "@/src/features/hackathon/kinds";

const VISIBILITY = new Set(["public", "private", "invite_only", "hybrid", "vip_tiered"]);

function allowedVisibility(accessType: string, visibility: string): string {
  if (accessType === "vip_tiered" || visibility === "tiered") return "vip_tiered";
  if (VISIBILITY.has(accessType)) return accessType;
  if (VISIBILITY.has(visibility)) return visibility;
  return "public";
}

function asIsoDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return toIsoDate(raw) || null;
}

function locationFormat(format: string): "physical" | "virtual" | "hybrid" {
  if (format === "virtual" || format === "hybrid") return format;
  return "physical";
}

function pgMessage(error: { message?: string; details?: string; hint?: string } | null | undefined): string {
  if (!error) return "The event could not be saved.";
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ");
}

function mapAgendaItem(a: Record<string, unknown>) {
  const dateRaw = a.session_date ?? a.date ?? a.sessionDate;
  return {
    sessionId: String(a.id ?? a.sessionId ?? ""),
    title: String(a.title ?? ""),
    type: a.item_type ?? a.type,
    startTime: a.start_clock ?? a.startTime,
    endTime: a.end_clock ?? a.endTime,
    date: toIsoDate(dateRaw) || String(dateRaw ?? ""),
    speakerNames: Array.isArray(a.speaker_names) ? a.speaker_names : Array.isArray(a.speakerNames) ? a.speakerNames : [],
    location: a.location,
    description: a.description,
    tiers: Array.isArray(a.tiers) ? a.tiers : [],
  };
}

function mapFormDataToEventModel(formData: EventFormData): EventModel {
  // 1. Structure the schedule object.
  // Times stored as 12-hour ("10:00 AM"); dates stay DD/MM/YYYY.
  const schedule = {
    startDate: formData.startDate ? formatDate(formData.startDate) : "",
    endDate: formData.endDate ? formatDate(formData.endDate) : "",
    startTime: formatTime(formData.startTime),
    endTime: formatTime(formData.endTime),
    timezone: formData.timezone,
    isRecurring: formData.isRecurring,
    recurrencePattern: formData.isRecurring ? formData.recurrenceType : null,
  };

  // 2. Structure the location object (mapping coordinates and flat fields safely)
  const location = {
    venueName: formData.venueName,
    address: formData.address,
    city: formData.city,
    country: "", // Add if available in your form later, otherwise defaults to model safe fallback
    coordinates: {
      latitude: formData.coordinates?.lat ?? 0,
      longitude: formData.coordinates?.lng ?? 0,
    },
    // Map virtual properties if it's virtual or hybrid
    meetingPlatform: formData.locationType !== 'physical' ? "Custom" : null,
    meetingLink: formData.locationType !== 'physical' ? (formData.meetingLink || formData.videoUrl) : null,
    meetingId: null,
    meetingPassword: null,
    parkingInfo: "",
    accessibilityInfo: "",
    nearbyHotels: [],
    nearbyRestaurants: [],
  };

  // 3. Structure the capacity object
  const capacity = {
    totalSeats: formData.totalSeats,
    reservedSeats: formData.reservedSeats,
    availableSeats: Math.max(0, formData.totalSeats - formData.reservedSeats),
    waitingListEnabled: formData.enableWaitingList,
    waitingListCapacity: formData.enableWaitingList ? formData.waitingListCapacity : 0, 
    maxRegistrationsPerUser: formData.maxTicketsPerPerson,
  };

  // 4. Transform CustomField frontend interface to backend customForm schema layout
  const customForm = (formData.customFields ?? []).map((field) => ({
    fieldId: field.id,
    label: field.label,
    type: field.type,
    options: (field.options || []).map((o) => String(o).trim()).filter(Boolean),
    required: field.required,
    askOnce: field.askOnce === "group" ? "group" : "member",
    helpText: "",
  }));

  // 5. Structure the registration limits and setups
  const registration = {
    registrationOpenDate: formData.registrationOpenDate ? formatDate(formData.registrationOpenDate) : "",
    registrationCloseDate: formData.registrationCloseDate ? formatDate(formData.registrationCloseDate) : "",
    requiresApproval: formData.requiresApproval,
    customForm: customForm,
    groupRegistrationEnabled: !!formData.groupRegistration,
    groupRegistration: !!formData.groupRegistration,
    groupMinSize: Number(formData.groupMinSize) || 2,
    groupMaxSize: Number(formData.groupMaxSize) || 8,
    groupDiscountEnabled: formData.groupDiscount,
  };

  // 6. Map TicketTiers from form to the expected pricing structures
  const pricing = {
    isFree: formData.ticketType === 'free',
    currency: "PKR", // Default application currency
    tiers: (formData.ticketTiers ?? []).map((tier) => ({
      name: tier.name,
      price: formData.ticketType === 'free' ? 0 : tier.price,
      availableUntil: tier.availableUntil ? formatDate(tier.availableUntil) : "",
      seats: tier.seatsAvailable,
      description: tier.description,
    })),
    studentDiscount: {
      enabled: formData.studentDiscount,
      percentage: formData.studentDiscountPercent,
      requiresVerification: true,
    },
    groupDiscount: {
      enabled: formData.groupDiscount,
      minGroupSize: formData.minSizeForGroupDiscounts,
      percentage: formData.groupDiscountPercent,
    },
  };

  // 7. Assemble raw object mirroring standard backend updates.
  // Event start/end are NOT stored as timestamps — they're derived from
  // `schedule` (DD/MM/YYYY + 12h) by the EventModel getters. createdAt/
  // updatedAt/publishedAt are Postgres timestamptz columns.
  const rawModelPayload = {
    eventId: "",
    organizerId: "", 
    title: formData.eventTitle,
    description: formData.description,
    shortDescription: formData.shortDescription,
    category: formData.category,
    eventType: formData.eventType,
    superCategoryId: formData.superCategoryId || formData.categorySuperId || "",
    eventFormatId: formData.eventFormatId || formData.categoryFormatId || "",
    categorySuperId: formData.categorySuperId || formData.superCategoryId || "",
    categoryFormatId: formData.categoryFormatId || formData.eventFormatId || "",
    categoryFields: formData.categoryFields || formData.customFieldValues || {},
    customFieldValues: formData.customFieldValues || formData.categoryFields || {},
    // Filled in by create_event from the taxonomy templates; the form never
    // sends one, so there is nothing to map here.
    checklist: [],
    format: formData.isHackathon ? "hackathon" : formData.locationType,
    language: "en",
    schedule: schedule,
    location: location,
    bannerImage: formData.bannerImage || "",
    galleryImages: formData.galleryImages,
    promoVideoUrl: formData.videoUrl,
    capacity: capacity,
    registration: registration,
    pricing: pricing,
    speakers: [], 
    agenda: [],   
    vendorRequirements: [],
    teamMembers: [],
    status: formData.isDraft || !formData.publishImmediately ? "draft" : "published",
    accessType: formData.accessType || ((formData.visibility as string) === "tiered" ? "vip_tiered" : formData.visibility) || "public",
    visibility: formData.accessType === "vip_tiered" ? "vip_tiered" : (formData.accessType || formData.visibility || "public"),
    whitelistEmails: Array.isArray(formData.whitelistEmails) ? formData.whitelistEmails : [],
    accessCode: formData.accessCode ? formData.accessCode.trim() : null,
    capacityCount: formData.totalSeats || 0,
    waitlistEnabled: formData.waitlistEnabled !== undefined ? Boolean(formData.waitlistEnabled) : Boolean(formData.enableWaitingList),
    approvalRequired: formData.approvalRequired !== undefined ? Boolean(formData.approvalRequired) : Boolean(formData.requiresApproval),
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: formData.isDraft || !formData.publishImmediately ? null : new Date(),
    archivedAt: null,
    deletedAt: null,
    PriceOfTicket : formData.PriceOfTicket,
    mapUrl: formData.mapUrl || "",
    requiresRegistration: formData.requiresRegistration !== false,
  };

  // Return generated implementation via the class factory instance
  return EventModel.fromJson(rawModelPayload);
}

export const EventService = {
  getEventByID: cache(async (id: string) => {
    const eventId = String(id ?? "").trim();
    if (!eventId) {
      console.warn("[getEventByID] called with empty id");
      return null;
    }
    try {
      const { data, error } = await supabaseAdmin.from(TABLES.EVENTS).select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [{ data: checklist }, { data: speakers }, { data: agenda }] = await Promise.all([
        supabaseAdmin.from(TABLES.EVENT_CHECKLIST_ITEMS).select("*").eq("event_id", eventId),
        supabaseAdmin.from(TABLES.EVENT_SPEAKERS).select("*").eq("event_id", eventId),
        supabaseAdmin.from(TABLES.EVENT_AGENDA_ITEMS).select("*").eq("event_id", eventId),
      ]);
      const extra = data.extra && typeof data.extra === "object" && !Array.isArray(data.extra) ? (data.extra as Record<string, unknown>) : {};
      const extraAgenda = Array.isArray(extra.agenda) ? extra.agenda : [];
      const tableAgenda = (agenda ?? []).filter((a) => a && typeof a === "object").map((a) => mapAgendaItem(a as Record<string, unknown>));
      const mappedAgenda =
        tableAgenda.length > 0
          ? tableAgenda
          : extraAgenda.filter((row) => row && typeof row === "object").map((row) => mapAgendaItem(row as Record<string, unknown>));
      const payload = {
        ...data,
        id: data.id,
        eventId: data.id,
        checklist: (checklist ?? []).map((c) => ({ label: c.label, done: c.done })),
        speakers: (speakers ?? []).map((s) => ({
          speakerId: s.id,
          name: s.name,
          designation: s.designation || "",
          bio: s.bio || "",
          profileImage: s.profile_image || "",
          sessionTitle: s.session_title || "",
          purpose: s.purpose || "",
          start_time: s.start_time || "",
          end_time: s.end_time || "",
          email: s.email || "",
          phone: s.phone || "",
          isContactPublic: Boolean(s.is_contact_public),
          linkedin: s.linkedin || "",
          twitter: s.twitter || "",
          website: s.website || "",
          company: s.company || "",
        })),
        agenda: mappedAgenda,
        pricing: data.pricing || {},
      };
      try {
        return EventModel.fromJson(payload);
      } catch (mapErr) {
        console.error("[getEventByID] map failed, returning core row", { id: eventId, mapErr });
        return EventModel.fromJson({ ...data, id: data.id, eventId: data.id, pricing: data.pricing || {} });
      }
    } catch (err) {
      console.error("[getEventByID] read failed", { id: eventId, err });
      throw new Error(`Failed to fetch event ${eventId}`, { cause: err });
    }
  }),
  async getRecentRegEvents(event_id: string): Promise<RecentRegistration[]> {
    const { data: snap, error } = await supabaseAdmin.from(TABLES.REGISTRATIONS).select("*").eq("event_id", event_id);
    if (error) throw error;
    const allDocs = (snap ?? []).map((row) => ({
      row,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(0),
    }));
    allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const top10 = allDocs.slice(0, 10);
    const statusMap: Record<string, RecentRegistration["status"]> = {
      registered: "CONFIRMED",
      checked_in: "CONFIRMED",
      pending_approval: "PENDING",
      awaiting_payment: "PENDING",
      cancelled: "CANCELLED",
      rejected: "CANCELLED",
      waitlisted: "PENDING",
    };
    return top10.map(({ row }) => ({
      id: row.id,
      attendeeName: row.attendee_name || "—",
      eventName: "—",
      amountPaid: row.amount_paid ?? row.final_price ?? 0,
      status: statusMap[String(row.status || "").toLowerCase()] ?? "PENDING",
    }));
  },
  async getAllEventsByOrganizer(organizer_id: string) {
    const { data, error } = await supabaseAdmin.from(TABLES.EVENTS).select("*").eq("organizer_id", organizer_id);
    if (error) throw error;
    return (data ?? []).map((row) => EventModel.fromJson(row));
  },
  async getRecentReg(event_id: string) {
    const { data, error } = await supabaseAdmin.from(TABLES.REGISTRATIONS).select("*").eq("event_id", event_id);
    if (error) throw error;
    return (data ?? []).map((row) => EventModel.fromJson(row));
  },
  async create_event(formdata: EventFormData, organizer_id: string) {
    const event_to_be_added: EventModel = mapFormDataToEventModel(formdata);
    event_to_be_added.organizerId = organizer_id;

    const targetSuperId = formdata.superCategoryId || formdata.categorySuperId || "";
    const targetFormatId = formdata.eventFormatId || formdata.categoryFormatId || "";

    const engineSuper = await CategoryEngineService.getSuperCategoryById(targetSuperId);
    const engineFormat = await CategoryEngineService.getEventFormatById(targetFormatId);

    const taxonomy = await listTaxonomy();
    let superCategory = engineSuper || selectable(taxonomy, "super").find((t) => t.id === targetSuperId);
    let eventFormat = engineFormat || selectable(taxonomy, "format").find((t) => t.id === targetFormatId);

    const wantsHackathon =
      String(targetFormatId || "").toLowerCase() === "hackathon" ||
      String(formdata.eventType || "").toLowerCase().includes("hackathon");
    if (wantsHackathon && !eventFormat) {
      eventFormat = selectable(taxonomy, "format").find((t) => {
        const id = String(t.id || "").toLowerCase();
        const name = String(t.name || "").toLowerCase();
        return id === "hackathon" || name === "hackathon" || id.includes("hackathon") || name.includes("hackathon");
      });
    }
    if (wantsHackathon && eventFormat && !superCategory) {
      const supers = selectable(taxonomy, "super");
      superCategory =
        supers.find((t) => /tech/i.test(`${t.id} ${t.name}`)) || supers[0];
    }

    if (!superCategory || !eventFormat) {
      throw new Error("Choose a category and an event format before publishing.");
    }

    if ("fields" in superCategory && Array.isArray((superCategory as any).fields)) {
      const missing = missingRequired((superCategory as any).fields, event_to_be_added.categoryFields);
      if (missing.length) {
        throw new Error(`Please fill in: ${missing.join(", ")}.`);
      }
      const allowed = new Set((superCategory as any).fields.map((f: any) => f.fieldId || f.key));
      event_to_be_added.categoryFields = Object.fromEntries(
        Object.entries(event_to_be_added.categoryFields).filter(([k]) => allowed.has(k)),
      );
    }

    event_to_be_added.category = superCategory.name;
    event_to_be_added.eventType = eventFormat.name;
    event_to_be_added.superCategoryId = targetSuperId;
    event_to_be_added.categorySuperId = targetSuperId;
    event_to_be_added.eventFormatId = targetFormatId;
    event_to_be_added.categoryFormatId = targetFormatId;
    event_to_be_added.customFieldValues = formdata.customFieldValues || formdata.categoryFields || {};

    if ("checklist" in superCategory || "checklist" in eventFormat) {
      event_to_be_added.checklist = resolveChecklist(superCategory as any, eventFormat as any).map((label) => ({
        label,
        done: false,
      }));
    }

    if (formdata.isDraft) {
      event_to_be_added.status = "draft";
    }

    const { data: profile } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("org_id")
      .eq("user_id", organizer_id)
      .maybeSingle();

    let orgId: string | null = profile?.org_id || null;
    if (orgId) {
      const { data: orgRow } = await supabaseAdmin.from(TABLES.ORGANIZATIONS).select("id").eq("id", orgId).maybeSingle();
      if (!orgRow) orgId = null;
    }

    const payload = {
      organizer_id,
      org_id: orgId,
      title: event_to_be_added.title,
      short_description: event_to_be_added.shortDescription,
      description: event_to_be_added.description,
      super_category_id: targetSuperId || null,
      event_format_id: targetFormatId || null,
      custom_field_values: event_to_be_added.customFieldValues,
      event_type: event_to_be_added.eventType,
      category: event_to_be_added.category,
      format: locationFormat(String(event_to_be_added.format || formdata.locationType || "physical")),
      status: event_to_be_added.status === "published" ? "published" : "draft",
      visibility: allowedVisibility(event_to_be_added.accessType, event_to_be_added.visibility),
      access_code: event_to_be_added.accessCode,
      language: event_to_be_added.language,
      banner_image: typeof event_to_be_added.bannerImage === "string" ? event_to_be_added.bannerImage : "",
      gallery_images: (event_to_be_added.galleryImages ?? []).filter((u): u is string => typeof u === "string" && u.length > 0),
      venue_name: event_to_be_added.location.venueName,
      address: event_to_be_added.location.address,
      city: event_to_be_added.location.city,
      country: event_to_be_added.location.country,
      coordinates: { lat: event_to_be_added.location.coordinates.latitude, lng: event_to_be_added.location.coordinates.longitude },
      meeting_link: event_to_be_added.location.meetingLink,
      map_url: event_to_be_added.mapUrl || formdata.mapUrl || "",
      requires_registration: formdata.requiresRegistration !== false,
      promo_video_url: event_to_be_added.promoVideoUrl || formdata.videoUrl || "",
      start_date: asIsoDate(formdata.startDate),
      end_date: asIsoDate(formdata.endDate || formdata.startDate),
      start_time: event_to_be_added.schedule.startTime,
      end_time: event_to_be_added.schedule.endTime,
      timezone: event_to_be_added.schedule.timezone,
      is_recurring: event_to_be_added.schedule.isRecurring,
      total_seats: event_to_be_added.capacity.totalSeats,
      reserved_seats: event_to_be_added.capacity.reservedSeats,
      available_seats: event_to_be_added.capacity.availableSeats,
      waitlist_enabled: event_to_be_added.waitlistEnabled,
      is_free: event_to_be_added.pricing.isFree,
      currency: event_to_be_added.pricing.currency,
      pricing: event_to_be_added.pricing,
      requires_approval: event_to_be_added.approvalRequired,
      registration_open_date: asIsoDate(formdata.registrationOpenDate),
      registration_close_date: asIsoDate(formdata.registrationCloseDate),
      custom_form: formdata.requiresRegistration === false ? [] : event_to_be_added.registration.customForm,
      published_at: event_to_be_added.status === "published" ? new Date().toISOString() : null,
    };

    let { data: inserted, error } = await supabaseAdmin.from(TABLES.EVENTS).insert(payload).select("id").single();
    if (error && orgId && /org_id|foreign key/i.test(`${error.message} ${error.details || ""}`)) {
      const retry = await supabaseAdmin.from(TABLES.EVENTS).insert({ ...payload, org_id: null }).select("id").single();
      inserted = retry.data;
      error = retry.error;
    }
    if (error || !inserted?.id) {
      console.error("[create_event] insert failed", error);
      throw new Error(pgMessage(error));
    }
    const id_generated = inserted.id;

    if (event_to_be_added.checklist.length) {
      await supabaseAdmin.from(TABLES.EVENT_CHECKLIST_ITEMS).insert(
        event_to_be_added.checklist.map((c, i) => ({ event_id: id_generated, label: c.label, done: c.done, sort_order: i })),
      );
    }

    if (Array.isArray(formdata.eventTiers) && formdata.eventTiers.length > 0) {
      await supabaseAdmin.from(TABLES.EVENT_ACCESS_TIERS).insert(
        formdata.eventTiers.map((tier, idx) => ({
          event_id: id_generated,
          name: tier.name,
          description: tier.description || "",
          sort_order: typeof tier.order === "number" ? tier.order : idx + 1,
        })),
      );
    }

    try {
      await seedEventTasksFromTemplate(id_generated, targetSuperId, targetFormatId, formdata.startDate);
    } catch (taskErr) {
      console.error("[create_event] Error seeding event tasks:", taskErr);
    }

    try {
      await CertificateTemplateService.insert_generic_Template(organizer_id);
    } catch (certErr) {
      console.error("[create_event] certificate template skipped", certErr);
    }

    const formatName = String(eventFormat.name || "").toLowerCase();
    const formatId = String(targetFormatId || "").toLowerCase();
    const isHackathonEvent = !!formdata.isHackathon || formatId === "hackathon" || formatName === "hackathon" || formatId.includes("hackathon") || formatName.includes("hackathon");
    if (isHackathonEvent) {
      const drafts = Array.isArray(formdata.wizardTracks) && formdata.wizardTracks.length
        ? formdata.wizardTracks
        : [{ name: "Main", description: "", imageUrl: "", fee: 0, discountPercent: 0, discountNote: "", discountExpiresAt: "", policies: "", instructions: "", minTeamSize: 1, maxTeamSize: 4 }];
      const { error: trackError } = await supabaseAdmin.from(TABLES.HACKATHON_TRACKS).insert(
        drafts.map((track) => ({
          event_id: id_generated,
          organizer_id,
          name: String(track.name || "Main").trim().slice(0, 120) || "Main",
          description: String(track.description || "").slice(0, 4000),
          fee: Math.max(0, Number(track.fee) || 0),
          currency: "PKR",
          min_team_size: Math.max(1, Number(track.minTeamSize) || 1),
          max_team_size: Math.max(1, Number(track.maxTeamSize) || 4),
          image_url: track.imageUrl || "",
          policies: track.policies || "",
          instructions: track.instructions || "",
          discount_percent: Math.max(0, Number(track.discountPercent) || 0),
          discount_note: track.discountNote || "",
          discount_expires_at: asIsoDate("discountExpiresAt" in track ? track.discountExpiresAt : ""),
          status: "open",
          kind: parseHackathonKind("kind" in track ? track.kind : "other"),
          rules_text: String("rulesText" in track ? track.rulesText : ""),
          rubric: [],
          current_round: 1,
        })),
      );
      if (trackError) {
        console.error("[create_event] hackathon tracks failed", trackError);
      }
    }

    return id_generated;
  },

  async update_event(event_id: string, patch: Record<string, unknown>): Promise<void> {
    if (!event_id) throw new Error("update_event called without an event id");
    const keys = Object.keys(patch);
    if (!keys.length) throw new Error("update_event called with an empty patch");
    for (const forbidden of ["id", "eventId", "organizerId", "createdAt", "organizer_id"]) {
      if (forbidden in patch) {
        throw new Error(`update_event refuses to change ${forbidden}`);
      }
    }
    const snake: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const map: Record<string, string> = {
      title: "title",
      description: "description",
      status: "status",
      visibility: "visibility",
      accessCode: "access_code",
      accessType: "visibility",
      waitlistEnabled: "waitlist_enabled",
      approvalRequired: "requires_approval",
      bannerImage: "banner_image",
    };
    for (const [k, v] of Object.entries(patch)) {
      snake[map[k] || k] = v;
    }
    const { error } = await supabaseAdmin.from(TABLES.EVENTS).update(snake).eq("id", event_id);
    if (error) {
      console.error("[update_event] write failed", { event_id, keys, error });
      throw new Error(`Failed to update event ${event_id}`, { cause: error });
    }
  },
};

