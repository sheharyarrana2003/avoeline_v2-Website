import { mockBookings } from "@/app/mockdata/bookings.mock";
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { mockEvents } from "@/app/mockdata/events.mock";
import { BookingData } from "./types";



export const BookingServices = {
  async getBookingsOfOrganizer(organizerId: string) {
    const rawBookings = mockBookings.filter((booking) => booking.organizerId === organizerId);
    const shapedBookings = rawBookings.map((booking) => {
      const vendor = mockVendors.find((v) => v.vendorId === booking.vendorId);
      const event = mockEvents.find((e) => e.id === booking.eventId);

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
        eventDate: event ? event.date : "No date mentioned",

        status: booking.status
      };
    });

    return shapedBookings;
  },

  async getBookingById(booking_id: string) {
    return mockBookings.find(b=>b.bookingId===booking_id) || null;
  },
  async getAllBookingsOfOrganizer(organizerId:String){
    return mockBookings.filter((booking) => booking.organizerId === organizerId);
  },
    async getAllBookingsOfVendor(vendorId:String){
    return mockBookings.filter((booking) => booking.vendorId === vendorId);
  }
}

