import { EventFormData, EventModel } from "./models/event.model";
import { RecentRegistration } from '../features/dashboard/types';
import { adminDb } from "@/data/admin_db";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";


function mapFormDataToEventModel(formData: EventFormData): EventModel {
  // 1. Structure the schedule object
  const schedule = {
    startDate: formData.startDate,
    endDate: formData.endDate,
    startTime: formData.startTime,
    endTime: formData.endTime,
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
    waitingListCapacity: formData.enableWaitingList ? 20 : 0,  // ! change
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
    registrationOpenDate: "", // ! change
    registrationCloseDate: formData.startDate,  // ! change
    requiresApproval: formData.requiresApproval,
    customForm: customForm,
    earlyBirdDeadline: "", // ! change
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
      availableUntil: tier.availableUntil,
      seats: tier.seatsAvailable,
      description: tier.benefits,
    })),
    studentDiscount: {
      enabled: formData.studentDiscount,
      percentage: formData.studentDiscountPercent,
      requiresVerification: true,
    },
    groupDiscount: {
      enabled: formData.groupDiscount,
      minGroupSize: 5, // ! change
      percentage: formData.groupDiscountPercent,
    },
  };

  // 7. Calculate combined dates for the timestamps based on your parseDate logic
  const combineDateTime = (dateStr: string, timeStr: string): Date => {
    if (!dateStr) return new Date();
    const time = timeStr || "00:00";
    return new Date(`${dateStr}T${time}`);
  };

  // 8. Assemble raw object mirroring standard backend updates
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
    eventStartTime: combineDateTime(formData.startDate, formData.startTime),
    eventEndTime: combineDateTime(formData.endDate, formData.endTime),
    archivedAt: null,
    deletedAt: null,
  };

  // Return generated implementation via the class factory instance
  return EventModel.fromJson(rawModelPayload);
}

export const EventService = {

  async getEventByID(id: string) {
    if (!id) {
      console.warn("[getEventByID] called with empty id");
      return null;
    };
    let querySnapshot: QuerySnapshot;


    try {
      querySnapshot = await adminDb.collection(COLLECTIONS.EVENTS).where("id", "==", id).get();
    } catch (err) {
      console.error("[getEventByID] Firestore query failed", { id, err });
      throw new Error(`Failed to fetch event ${id}`, { cause: err });
    }


    if (querySnapshot.empty) {
      console.info(`[getEventByID] no event found for id=${id}`);
      return null;
    }

    try {
      return EventModel.fromJson(querySnapshot.docs[0].data());
    } catch (err) {
      // Data exists but is malformed 
      console.error("[getEventByID] failed to parse event data", { id, err });
      throw new Error(`Malformed event data for ${id}`, { cause: err });
    }



  },
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

    // Resolve each attendee's name from users/{userId}/profile.fullName in parallel
    const results: RecentRegistration[] = await Promise.all(
      top10.map(async ({ doc }) => {
        const data = doc.data();
        const rawStatus = (data.status || "pending").toLowerCase();

        // Try embedded fields first (fast path), then look up the user document
        let attendeeName: string =
          data.attendeeName || data.userName || data.fullName || "";

        if (!attendeeName && data.userId) {
          try {
            const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(data.userId).get();
            if (userSnap.exists) {
              const u = userSnap.data()!;
              attendeeName =
                u.profile?.fullName ||
                u.name ||
                u.email ||
                data.userId;
            }
          } catch {
            attendeeName = data.userId;
          }
        }

        return {
          id: doc.id,
          attendeeName: attendeeName || "—",
          eventName: data.eventName || data.eventTitle || "—",
          amountPaid: data.payment?.amountPaid ?? data.finalPrice ?? 0,
          status: statusMap[rawStatus] ?? "PENDING",
        };
      })
    );

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
    const event_to_be_added: EventModel = mapFormDataToEventModel(formdata);
    event_to_be_added.organizerId = organizer_id;
 
    const docRef = adminDb.collection(COLLECTIONS.EVENTS).doc();
    const id_generated = docRef.id;
    event_to_be_added.id = id_generated;

    await adminDb.collection(COLLECTIONS.EVENTS).doc(id_generated).set({
      ...event_to_be_added
    })
    return id_generated;
  }
}