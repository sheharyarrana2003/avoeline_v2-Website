import { mockBookings } from "@/app/mockdata/bookings.mock";
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { mockEvents } from "@/app/mockdata/events.mock";
import { BookingData } from "./types";
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/data/db'
import { EventVendorService } from "../event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { adminDb } from "@/data/admin_db";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";
import { formatDate, formatTime } from "@/src/lib/datetime";

// Normalize a stored timestamp (Firebase Timestamp | ISO string | Date) to a
// Date, so system-timestamp fields round-trip as Firestore Timestamps on the
// whole-object update_booking write instead of degrading to strings.
function toDt(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function mapToBooking(item: any): BookingData {
  if (!item) {
    throw new Error("Cannot map an empty or null object to BookingData.");
  }

  return {
    bookingId: item.bookingId || "",
    eventId: item.eventId || "",
    vendorId: item.vendorId || "",
    organizerId: item.organizerId || "",
    serviceType: item.serviceType || "",
    serviceId: item.serviceId || "",

    // BOOKING REQUIREMENTS
    requirements: {
      description: item.requirements?.description || "",
      serviceDate: item.requirements?.serviceDate || "",
      startTime: item.requirements?.startTime || "",
      endTime: item.requirements?.endTime || "",
      location: item.requirements?.location || "",
      specialInstructions: item.requirements?.specialInstructions || "",
      guestCount: Number(item.requirements?.guestCount) || 0,
    },

    // QUOTE & NEGOTIATION
    quote: {
      requestedAt: toDt(item.quote?.requestedAt) ?? new Date(),
      respondedAt: toDt(item.quote?.respondedAt),
      vendorQuote: item.quote?.vendorQuote
        ? {
          basePrice: Number(item.quote.vendorQuote.basePrice) || 0,
          additionalCharges: Array.isArray(item.quote.vendorQuote.additionalCharges)
            ? item.quote.vendorQuote.additionalCharges.map((ac: any) => ({
              description: ac.description || "",
              amount: Number(ac.amount) || 0,
            }))
            : [],
          discount: Number(item.quote.vendorQuote.discount) || 0,
          totalAmount: Number(item.quote.vendorQuote.totalAmount) || 0,
          breakdown: Array.isArray(item.quote.vendorQuote.breakdown)
            ? item.quote.vendorQuote.breakdown.map((b: any) => ({
              item: b.item || "",
              quantity: Number(b.quantity) || 0,
              unitPrice: Number(b.unitPrice) || 0,
              total: Number(b.total) || 0,
            }))
            : [],
          terms: item.quote.vendorQuote.terms || "",
          validity: item.quote.vendorQuote.validity || "",
        }
        : null,
      negotiation: Array.isArray(item.quote?.negotiation)
        ? item.quote.negotiation.map((msg: any) => ({
          from: msg.from === "vendor" ? "vendor" : "organizer",
          message: msg.message || "",
          timestamp: toDt(msg.timestamp) ?? new Date(),
        }))
        : [],
    },

    // STATUS
    status: item.status || "quote_requested",
    statusHistory: Array.isArray(item.statusHistory)
      ? item.statusHistory.map((history: any) => ({
        status: history.status || "quote_requested",
        timestamp: toDt(history.timestamp) ?? new Date(),
      }))
      : [],

    // CONTRACT
    contract: {
      signed: Boolean(item.contract?.signed),
      signedByOrganizer: item.contract?.signedByOrganizer || null,
      signedByVendor: item.contract?.signedByVendor || null,
      signedAt: item.contract?.signedAt || null,
      contractUrl: item.contract?.contractUrl || null,
      terms: {
        cancellationPolicy: item.contract?.terms?.cancellationPolicy || "",
        liability: item.contract?.terms?.liability || "",
      },
    },

    // PAYMENT
    payment: {
      totalAmount: Number(item.payment?.totalAmount) || 0,
      currency: item.payment?.currency || "USD",
      paymentSchedule: Array.isArray(item.payment?.paymentSchedule)
        ? item.payment.paymentSchedule.map((p: any) => ({
          installment: p.installment || "",
          amount: Number(p.amount) || 0,
          dueDate: p.dueDate || "",
          status: ["pending", "paid", "failed", "refunded"].includes(p.status) ? p.status : "pending",
          paymentId: p.paymentId || null,
        }))
        : [],
      commission: {
        platformCommission: Number(item.payment?.commission?.platformCommission) || 0,
        platformCommissionPercentage: Number(item.payment?.commission?.platformCommissionPercentage) || 0,
        vendorReceives: Number(item.payment?.commission?.vendorReceives) || 0,
      },
    },

    // LOGISTICS & POST-EVENT
    delivery: {
      scheduledDate: item.delivery?.scheduledDate || "",
      scheduledTime: item.delivery?.scheduledTime || "",
      actualDeliveryTime: item.delivery?.actualDeliveryTime || null,
      deliveryNotes: item.delivery?.deliveryNotes || null,
      setupCompleted: Boolean(item.delivery?.setupCompleted),
      teardownCompleted: Boolean(item.delivery?.teardownCompleted),
    },

    // QUALITY CHECK
    qualityCheck: {
      organizerCheck: item.qualityCheck?.organizerCheck
        ? {
          checked: Boolean(item.qualityCheck.organizerCheck.checked),
          rating: item.qualityCheck.organizerCheck.rating !== undefined ? Number(item.qualityCheck.organizerCheck.rating) : null,
          comments: item.qualityCheck.organizerCheck.comments || null,
          checkedAt: item.qualityCheck.organizerCheck.checkedAt || null,
        }
        : null,
      vendorSelfCheck: item.qualityCheck?.vendorSelfCheck
        ? {
          completed: Boolean(item.qualityCheck.vendorSelfCheck.completed),
          report: item.qualityCheck.vendorSelfCheck.report || null,
        }
        : null,
    },

    // COMMUNICATIONS, DOCUMENTS & REVIEW
    communications: Array.isArray(item.communications)
      ? item.communications.map((comm: any) => ({
        type: comm.type || "chat",
        from: ["organizer", "vendor", "system"].includes(comm.from) ? comm.from : "system",
        to: ["organizer", "vendor", "system"].includes(comm.to) ? comm.to : "system",
        message: comm.message || "",
        timestamp: toDt(comm.timestamp) ?? new Date(),
      }))
      : [],
    documents: {
      quotePdf: item.documents?.quotePdf || null,
      invoicePdf: item.documents?.invoicePdf || null,
      receiptPdf: item.documents?.receiptPdf || null,
    },
    review: {
      organizerReviewId: item.review?.organizerReviewId || null,
      vendorReviewId: item.review?.vendorReviewId || null,
      organizerRating: item.review?.organizerRating !== undefined ? Number(item.review.organizerRating) : null,
      vendorRating: item.review?.vendorRating !== undefined ? Number(item.review.vendorRating) : null,
    },

    // SYSTEM TIMESTAMPS
    createdAt: toDt(item.createdAt) ?? new Date(),
    updatedAt: toDt(item.updatedAt) ?? new Date(),
    confirmedAt: toDt(item.confirmedAt),
    completedAt: toDt(item.completedAt),
    cancelledAt: toDt(item.cancelledAt),
  };
}
export const BookingServices = {
  async getBookingsOfOrganizer(organizerId: string) {

    let arr_of_bookings: BookingData[] = [];

    const q = adminDb.collection(COLLECTIONS.BOOKINGS).where("organizerId", "==", organizerId)


    const querySnapshot: QuerySnapshot = await q.get();
    if (querySnapshot.empty) {
      return null;
    }
    arr_of_bookings = querySnapshot.docs.map(doc => ({
      bookingId: doc.id,
      ...doc.data()
    })) as BookingData[];

    // get unique ids (spread the Set so each id is fetched once, not the Set itself)
    const vendor_unique_ids = [...new Set(arr_of_bookings.map(x=>x.vendorId))];
    const event_unique_ids = [...new Set(arr_of_bookings.map(x=>x.eventId))];

    // get vendor and events of these ids

    const vendors_from_db =  await Promise.all(vendor_unique_ids.map(x=>EventVendorService.getVendorById(String(x))));
    const events_from_db =  await Promise.all(event_unique_ids.map(x=>EventService.getEventByID(String(x))));

    // put them in a map

    const vendors_map = new Map();
    const events_map = new Map();

    vendors_from_db.map(x=>vendors_map.set(x?.vendorId,x));
    events_from_db.map(x=>events_map.set(x?.id,x));



    const shapedBookings = arr_of_bookings.map(async (booking) => {

      //repetative requests - if vendor repeat - request for every vendor
      // const [vendor, event] = await Promise.all([
      //   EventVendorService.getVendorById(booking.vendorId),
      //   EventService.getEventByID(booking.eventId)
      // ])

         const vendor = vendors_map.get(booking.vendorId);
      const event = events_map.get(booking.eventId);

      return {
        bookingId: booking.bookingId,
        requirements: {
          serviceDate: booking.requirements.serviceDate,
          description: booking.requirements.description,
        },
        quote: booking.quote ? {
          vendorQuote: {
            totalAmount: booking.quote.vendorQuote?.totalAmount,
          }
        } : undefined,

        vendor: vendor ? {
          vendorId: vendor.vendorId,
          businessName: vendor.businessName,
          serviceCategories: vendor.serviceCategories,
        } : {
          vendorId: 'unknown',
          businessName: 'Unknown Vendor',
          serviceCategories: [],
        },

        eventName: event ? event.title : "Unknown Event",
        eventDate: event ? event.schedule.startDate : "No date mentioned",

        status: booking.status
      };
    });

    const actual_shaped_bookings = await Promise.all(shapedBookings);
    return actual_shaped_bookings;
  },

  async getBookingById(booking_id: string) {
    const q = adminDb.
      collection(COLLECTIONS.BOOKINGS).
      where("bookingId", "==", booking_id)


    const querySnapshot: QuerySnapshot = await q.get();
    if (querySnapshot.empty) {
      return null;
    }
    const data = querySnapshot.docs[0].data();
    return mapToBooking(data);
  },


  async getAllBookingsOfOrganizer(organizerId: String) {
    let arr_of_bookings: BookingData[] = [];

    const q = adminDb.
      collection(COLLECTIONS.BOOKINGS).
      where("organizerId", "==", organizerId)


    const querySnapshot: QuerySnapshot = await q.get();
    if (querySnapshot.empty) {
      return null;
    }
    arr_of_bookings = querySnapshot.docs.map(doc => ({
      bookingId: doc.id,
      ...doc.data()
    })) as BookingData[];


    return arr_of_bookings;
  },
  async getAllBookingsOfVendor(vendorId: String) {
    let arr_of_bookings: BookingData[] = [];


    const q = adminDb.
      collection(COLLECTIONS.BOOKINGS).
      where("vendorId", "==", vendorId)


    const querySnapshot: QuerySnapshot = await q.get();
    if (querySnapshot.empty) {
      return null;
    }
    arr_of_bookings = querySnapshot.docs.map(doc => ({
      bookingId: doc.id,
      ...doc.data()
    })) as BookingData[];


    return arr_of_bookings;
  },
  async createBookingFromForm(
    formData: FormData,
    organizerId: string,
    eventId: string = '',
    vendorId: string = ''
  ) {
    const docRef = adminDb.collection(COLLECTIONS.BOOKINGS).doc();;
    const id_generated = docRef.id;
    const now = new Date(); // system timestamps → Firebase Timestamp

    // Extract basic textual values safely out of the form payload
    const serviceType = ((formData.get('serviceType') as string) || '').trim();
    // The RFQ form now posts the service's uuid as `serviceId`. Older forms sent the
    // selected option's text under `serviceName`, so fall back to that.
    const serviceId = ((formData.get('serviceId') as string) || (formData.get('serviceName') as string) || '').trim();
    const description = (formData.get('requirementsDescription') as string) || '';
    // Human date/time → DD/MM/YYYY and 12h. Inputs may arrive as ISO (date
    // picker) or 24h (time picker); the formatters normalize both.
    const rawServiceDate = (formData.get('serviceDate') as string) || '';
    const rawStartTime = (formData.get('startTime') as string) || '';
    const serviceDate = rawServiceDate ? formatDate(rawServiceDate) : '';
    const startTime = rawStartTime ? formatTime(rawStartTime) : '';

    // Budget range numerical parsing logic
    const baseBudget = Number(formData.get('budget')) || 50000;
    const platformCommissionPct = 15; // Matches the 15% rate set within your Vendor setup class
    const commissionAmount = (baseBudget * platformCommissionPct) / 100;

    const booking_object: BookingData = {
      bookingId: id_generated,
      eventId: eventId,
      vendorId: vendorId,
      organizerId: organizerId,
      serviceType: serviceType,
      serviceId: serviceId,

      requirements: {
        description: description,
        serviceDate: serviceDate,
        startTime: startTime,
        endTime: '',
        location: '',
        specialInstructions: 'Quote request generated via client RFQ dashboard.',
        guestCount: 0
      },

      quote: {
        requestedAt: now,
        respondedAt: null,
        vendorQuote: null, // Populated later once a vendor bids
        negotiation: []
      },

      status: 'quote_requested',
      statusHistory: [
        {
          status: 'quote_requested',
          timestamp: now
        }
      ],

      contract: {
        signed: false,
        signedByOrganizer: null,
        signedByVendor: null,
        signedAt: null,
        contractUrl: null,
        terms: {
          cancellationPolicy: 'Standard vendor profile policy applies.',
          liability: 'Standard marketplace terms apply.'
        }
      },

      payment: {
        totalAmount: baseBudget,
        currency: 'PKR',
        paymentSchedule: [],
        commission: {
          platformCommission: commissionAmount,
          platformCommissionPercentage: platformCommissionPct,
          vendorReceives: baseBudget - commissionAmount
        }
      },

      delivery: {
        scheduledDate: serviceDate,   // already formatted DD/MM/YYYY
        scheduledTime: startTime,     // already formatted 12h
        actualDeliveryTime: null,
        deliveryNotes: null,
        setupCompleted: false,
        teardownCompleted: false
      },

      qualityCheck: {
        organizerCheck: null,
        vendorSelfCheck: null
      },

      communications: [],
      documents: {
        quotePdf: null,
        invoicePdf: null,
        receiptPdf: null
      },

      review: {
        organizerReviewId: null,
        vendorReviewId: null,
        organizerRating: null,
        vendorRating: null
      },

      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null
    };

    await adminDb.collection(COLLECTIONS.BOOKINGS).doc(id_generated).set({ ...booking_object });
  },

  async update_booking(updated_booking: BookingData | null) {
    if (!updated_booking) {
      return;
    }
    await adminDb.collection(COLLECTIONS.BOOKINGS).doc(updated_booking.bookingId).update({ ...updated_booking });
  }

}

