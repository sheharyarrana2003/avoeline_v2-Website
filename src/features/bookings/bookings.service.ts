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
    return  actual_shaped_bookings;
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
  }
}

