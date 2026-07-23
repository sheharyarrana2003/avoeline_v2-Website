import { cache } from "react";
import { EventFormData, EventModel } from "./models/event.model";
import { RecentRegistration } from '../features/dashboard/types';
import { adminDb } from "@/data/admin_db";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";
import { formatDate, formatTime } from "@/src/lib/datetime";


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
    meetingLink: formData.locationType !== 'physical' ? formData.videoUrl : null,
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
  const customForm = formData.customFields.map((field) => ({
    fieldId: field.id,
    label: field.label,
    type: field.type,
    options: field.options || [],
    required: field.required,
    helpText: "",
  }));

  // 5. Structure the registration limits and setups
  const registration = {
    registrationOpenDate: formData.registrationOpenDate ? formatDate(formData.registrationOpenDate) : "",
    registrationCloseDate: formData.registrationCloseDate ? formatDate(formData.registrationCloseDate) : "",
    requiresApproval: formData.requiresApproval,
    customForm: customForm,
    groupRegistrationEnabled: formData.groupDiscount,
    groupDiscountEnabled: formData.groupDiscount,
  };

  // 6. Map TicketTiers from form to the expected pricing structures
  const pricing = {
    isFree: formData.ticketType === 'free',
    currency: "PKR", // Default application currency
    tiers: formData.ticketTiers.map((tier) => ({
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
  // `schedule` (DD/MM/YYYY + 12h) by the EventModel getters. Only createdAt/
  // updatedAt/publishedAt remain as Firebase auto-timestamps.
  const rawModelPayload = {
    eventId: "",
    organizerId: "", 
    title: formData.eventTitle,
    description: formData.description,
    shortDescription: formData.shortDescription,
    category: formData.category,
    eventType: formData.eventType,
    format: formData.locationType,
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
    status: formData.publishImmediately ? "published" : "draft",
    visibility: formData.visibility,
    accessCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: formData.publishImmediately ? new Date() : null,
    archivedAt: null,
    deletedAt: null,
    PriceOfTicket : formData.PriceOfTicket,
  };

  // Return generated implementation via the class factory instance
  return EventModel.fromJson(rawModelPayload);
}

export const EventService = {

  // Wrapped in React.cache() so repeated reads of the same event within a
  // single request (page + layout + agenda/speakers, etc.) hit Firestore once.
  getEventByID: cache(async (id: string) => {
    if (!id) {
      console.warn("[getEventByID] called with empty id");
      return null;
    }

    try {
      // Fast path: events are written with the document id equal to the `id`
      // field (see create_event), so a single keyed doc read replaces the
      // previous where("id","==") collection query.
      const docSnap = await adminDb.collection(COLLECTIONS.EVENTS).doc(id).get();
      if (docSnap.exists) {
        return EventModel.fromJson(docSnap.data());
      }

      // Fallback for any legacy docs whose document id != the `id` field.
      const querySnapshot = await adminDb.collection(COLLECTIONS.EVENTS).where("id", "==", id).get();
      if (querySnapshot.empty) {
        console.info(`[getEventByID] no event found for id=${id}`);
        return null;
      }
      return EventModel.fromJson(querySnapshot.docs[0].data());
    } catch (err) {
      console.error("[getEventByID] Firestore read failed", { id, err });
      throw new Error(`Failed to fetch event ${id}`, { cause: err });
    }
  }),
  async getRecentRegEvents(event_id: string): Promise<RecentRegistration[]> {
    // No orderBy — avoids composite index requirement; sort in memory
    const snap : QuerySnapshot= await adminDb
      .collection(COLLECTIONS.REGISTRATIONS)
      .where("eventId", "==", event_id)
      .get();

    const allDocs: { doc: FirebaseFirestore.QueryDocumentSnapshot; createdAt: Date }[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt
        ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date(data.createdAt))
        : new Date(0);
      allDocs.push({ doc, createdAt });
    });

    // Sort newest-first in memory — no composite index needed
    allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const top10 = allDocs.slice(0, 10);

    const statusMap: Record<string, RecentRegistration["status"]> = {
      confirmed: "CONFIRMED",
      checked_in: "CONFIRMED",
      attended: "CONFIRMED",
      pending: "PENDING",
      cancelled: "CANCELLED",
      no_show: "CANCELLED",
    };

    // Resolve names only for rows without an embedded name, in a single
    // batched getAll() instead of one user read per row (previously N+1).
    const lookupIds = [
      ...new Set(
        top10
          .map(({ doc }) => doc.data())
          .filter(d => !(d.attendeeName || d.userName || d.fullName) && d.userId)
          .map(d => d.userId as string)
      ),
    ];

    const userMap = new Map<string, FirebaseFirestore.DocumentData>();
    if (lookupIds.length) {
      const refs = lookupIds.map(id => adminDb.collection(COLLECTIONS.USERS).doc(id));
      const snaps: FirebaseFirestore.DocumentSnapshot[] = await adminDb.getAll(...refs);
      snaps.forEach((s, i) => {
        if (s.exists) userMap.set(lookupIds[i], s.data()!);
      });
    }

    const results: RecentRegistration[] = top10.map(({ doc }) => {
      const data = doc.data();
      const rawStatus = (data.status || "pending").toLowerCase();

      let attendeeName: string =
        data.attendeeName || data.userName || data.fullName || "";

      if (!attendeeName && data.userId) {
        const u = userMap.get(data.userId);
        attendeeName =
          (u && (u.profile?.fullName || u.name || u.email)) || data.userId;
      }

      return {
        id: doc.id,
        attendeeName: attendeeName || "—",
        eventName: data.eventName || data.eventTitle || "—",
        amountPaid: data.payment?.amountPaid ?? data.finalPrice ?? 0,
        status: statusMap[rawStatus] ?? "PENDING",
      };
    });

    return results;
  },
  async getAllEventsByOrganizer(organizer_id: string) {
    const querySnapshot: QuerySnapshot = await adminDb.collection(COLLECTIONS.EVENTS).where("organizerId", "==", organizer_id).get();

    let arr: EventModel[] = [];

    querySnapshot.forEach((doc) => {
      arr.push(EventModel.fromJson(doc.data()));
    });

    return arr;
  },
  async getRecentReg(event_id: string) {
    const querySnapshot: QuerySnapshot = await adminDb.collection(COLLECTIONS.REGISTRATIONS).where("eventId", "==", event_id).get();
    let arr: EventModel[] = [];

    querySnapshot.forEach((doc) => {
      arr.push(EventModel.fromJson(doc.data()));
    });

    return arr;

  },
  async create_event(formdata: EventFormData, organizer_id: string) {
    console.log(formdata);
    const event_to_be_added: EventModel = mapFormDataToEventModel(formdata);
    event_to_be_added.organizerId = organizer_id; // Remove the "o_" prefix from organizer_id
 
    const docRef = adminDb.collection(COLLECTIONS.EVENTS).doc();
    const id_generated = docRef.id;
    event_to_be_added.id = id_generated;
   
    if(formdata.isDraft){
      event_to_be_added.status = 'draft';
    }

    await adminDb.collection(COLLECTIONS.EVENTS).doc(id_generated).set({
      ...event_to_be_added
    })
    return id_generated;
  }
}