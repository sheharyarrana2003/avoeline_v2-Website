import { mockBookings } from "@/app/mockdata/bookings.mock";
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { mockEvents } from "@/app/mockdata/events.mock";
import { BookingData } from "./types";
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/data/db'
import { EventVendorService } from "../event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";


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
    return querySnapshot.docs[0].data();
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

