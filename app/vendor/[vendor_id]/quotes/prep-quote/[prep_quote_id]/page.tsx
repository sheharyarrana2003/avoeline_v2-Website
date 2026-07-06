// app/vendor/[vendor_id]/quotes/prep-quote/[prep_quote_id]/page.tsx
// Server Component - handles data fetching

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { notFound } from "next/navigation";
import PrepareQuoteClient from "@/src/features/bookings/shared_components/VendorPrepBookingClient";
import { BookingData } from "@/src/features/bookings/types";


export default async function PrepareQuotePage({ 
    params 
}: { 
    params: Promise<{ vendor_id: string; prep_quote_id: string }> 
}) {
    const { vendor_id, prep_quote_id } = await params;
    
    // Fetch booking data on server
    const booking : BookingData|null = await BookingServices.getBookingById(prep_quote_id);
    
    if (!booking) {
        console.log()
    }
    
    // Fetch event details
    let event = null;
    try {
        event = await EventService.getEventByID(booking.eventId);
    } catch {
        // Event not found
    }
    
    // Serialize data for client component
    const initialData = {
        bookingId: booking.bookingId,
        eventId: booking.eventId,
        eventTitle: event?.title || booking.eventId,
        organizerId: booking.organizerId,
        organizerName: booking.organizerId, // Replace with UserService fetch
        requirements: {
            description: booking.requirements?.description || "",
            serviceDate: booking.requirements?.serviceDate || "",
            startTime: booking.requirements?.startTime || "",
            endTime: booking.requirements?.endTime || "",
            location: booking.requirements?.location || "",
            guestCount: booking.requirements?.guestCount || 0,
            specialInstructions: booking.requirements?.specialInstructions || "",
        },
        existingQuote: booking.quote?.vendorQuote ? {
            basePrice: booking.quote.vendorQuote.basePrice || 0,
            additionalCharges: booking.quote.vendorQuote.additionalCharges || [],
            discount: booking.quote.vendorQuote.discount || 0,
            totalAmount: booking.quote.vendorQuote.totalAmount || 0,
            breakdown: booking.quote.vendorQuote.breakdown || [],
            terms: booking.quote.vendorQuote.terms || "",
            validity: booking.quote.vendorQuote.validity || "",
        } : null,
        currency: booking.payment?.currency || "PKR",
        communications: booking.communications || [],
        documents: booking.documents || {},
    };

    return <PrepareQuoteClient vendorId={vendor_id} initialData={initialData} />;
}