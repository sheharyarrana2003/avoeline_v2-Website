import { mockBookings } from "@/app/mockdata/bookings.mock";
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { mockEvents } from "@/app/mockdata/events.mock";
import { BookingData } from "./types";
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/data/db'
import { EventVendorService } from "../event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";

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
            requestedAt: item.quote?.requestedAt || new Date().toISOString(),
            respondedAt: item.quote?.respondedAt || null,
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
                    timestamp: msg.timestamp || new Date().toISOString(),
                  }))
                : [],
        },

        // STATUS
        status: item.status || "quote_requested",
        statusHistory: Array.isArray(item.statusHistory)
            ? item.statusHistory.map((history: any) => ({
                status: history.status || "quote_requested",
                timestamp: history.timestamp || new Date().toISOString(),
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
                timestamp: comm.timestamp || new Date().toISOString(),
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
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        confirmedAt: item.confirmedAt || null,
        completedAt: item.completedAt || null,
        cancelledAt: item.cancelledAt || null,
    };
}
export const BookingServices = {
  async getBookingsOfOrganizer(organizerId: string) {

    let arr_of_bookings: BookingData[] = [];

    const q = query(
      collection(db, "bookings"),
      where("organizerId", "==", organizerId)
    )

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log("query shot is emptyyy");
      return null;
    }
    arr_of_bookings = querySnapshot.docs.map(doc => ({
      bookingId: doc.id,
      ...doc.data()
    })) as BookingData[];




    const shapedBookings = arr_of_bookings.map(async (booking) => {
      const vendor = await EventVendorService.getVendorById(booking.vendorId);
      const event = await EventService.getEventByID(booking.eventId);

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
    const q = query(
      collection(db, "bookings"),
      where("bookingId", "==", booking_id)
    )
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const data = querySnapshot.docs[0].data();
    return mapToBooking(data);
  },


  async getAllBookingsOfOrganizer(organizerId: String) {
    let arr_of_bookings: BookingData[] = [];

    const q = query(
      collection(db, "bookings"),
      where("organizerId", "==", organizerId)
    )

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log("query shot is emptyyy");
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

    const q = query(
      collection(db, "bookings"),
      where("vendorId", "==", vendorId)
    )

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log("query shot is emptyyy");
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
      const docRef = doc(collection(db,"bookings"));
      const id_generated = docRef.id;
    const timestamp = new Date().toISOString();

    // Extract basic textual values safely out of the form payload
    const serviceType = (formData.get('serviceType') as string) || '';
    const serviceId = (formData.get('serviceName') as string) || ''; // Using serviceName field to match context
    const description = (formData.get('requirementsDescription') as string) || '';
    const serviceDate = (formData.get('serviceDate') as string) || '';
    const startTime = (formData.get('startTime') as string) || '';

    // Budget range numerical parsing logic
    const baseBudget = Number(formData.get('budget')) || 50000;
    const platformCommissionPct = 15; // Matches the 15% rate set within your Vendor setup class
    const commissionAmount = (baseBudget * platformCommissionPct) / 100;

    const booking_object : BookingData =  {
      bookingId: id_generated,
      eventId: eventId ,
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
        requestedAt: timestamp,
        respondedAt: null,
        vendorQuote: null, // Populated later once a vendor bids
        negotiation: []
      },

      status: 'quote_requested',
      statusHistory: [
        {
          status: 'quote_requested',
          timestamp: timestamp
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
        scheduledDate: serviceDate,
        scheduledTime: startTime,
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

      createdAt: timestamp,
      updatedAt: timestamp,
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null
    };

    await setDoc(docRef,{...booking_object});
    console.log("populated the booking -> ",id_generated);
  }


}

