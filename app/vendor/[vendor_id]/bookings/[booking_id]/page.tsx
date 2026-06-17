// app/organizer/[organizer_id]/bookings/[booking_id]/page.tsx
// Server Component - handles data fetching

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { notFound } from "next/navigation";
import BookingDetailClient from "@/src/features/bookings/shared_components/VendorBookingDetailClient";

export default async function BookingDetailPage({ 
    params 
}: { 
    params: Promise<{ organizer_id: string; booking_id: string }> 
}) {
    const { organizer_id, booking_id } = await params;

    // Fetch data
    const raw_booking = await BookingServices.getBookingById(booking_id);
    
    if (!raw_booking) {
        notFound();
    }

    const vendor = await EventVendorService.getVendorById(raw_booking?.vendorId || '');
    const event = await EventService.getEventByID(raw_booking?.eventId || '');

    // Serialize data for client
    const initialData = {
        bookingId: raw_booking.bookingId,
        eventId: raw_booking.eventId,
        eventTitle: event?.title || raw_booking.eventId,
        organizerId: raw_booking.organizerId,
        vendorId: raw_booking.vendorId,
        vendorName: vendor?.businessName || "Unknown Vendor",
        vendorRating: vendor?.ratings?.averageRating || 0,
        vendorTotalReviews: vendor?.ratings?.totalReviews || 0,
        serviceType: raw_booking.serviceType,
        status: raw_booking.status,
        statusHistory: raw_booking.statusHistory || [],
        requirements: {
            description: raw_booking.requirements?.description || "",
            serviceDate: raw_booking.requirements?.serviceDate || "",
            startTime: raw_booking.requirements?.startTime || "",
            endTime: raw_booking.requirements?.endTime || "",
            location: raw_booking.requirements?.location || "",
            guestCount: raw_booking.requirements?.guestCount || 0,
            specialInstructions: raw_booking.requirements?.specialInstructions || "",
        },
        quote: raw_booking.quote || null,
        contract: raw_booking.contract || null,
        payment: raw_booking.payment || null,
        delivery: raw_booking.delivery || null,
        qualityCheck: raw_booking.qualityCheck || null,
        communications: raw_booking.communications || [],
        documents: raw_booking.documents || {},
        review: raw_booking.review || null,
        createdAt: raw_booking.createdAt,
        updatedAt: raw_booking.updatedAt,
        completedAt: raw_booking.completedAt,
        confirmedAt: raw_booking.confirmedAt,
    };

    return <BookingDetailClient organizerId={organizer_id} initialData={initialData} />;
}