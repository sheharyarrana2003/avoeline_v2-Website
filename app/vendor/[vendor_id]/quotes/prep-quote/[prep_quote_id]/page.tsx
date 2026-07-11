// app/vendor/[vendor_id]/quotes/prep-quote/[prep_quote_id]/page.tsx
// Server Component - handles data fetching

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { notFound } from "next/navigation";
import PrepareQuoteClient from "@/src/features/bookings/shared_components/VendorPrepBookingClient";
import { BookingData } from "@/src/features/bookings/types";
import { BreakdownItem } from "@/src/features/bookings/types";
import { VendorQuote } from "@/src/features/bookings/types";
import { NegotiationMessage } from "@/src/features/bookings/types";


export default async function PrepareQuotePage({
    params
}: {
    params: Promise<{ vendor_id: string; prep_quote_id: string }>
}) {
    const { vendor_id, prep_quote_id } = await params;

    // Fetch booking data on server
    const booking: BookingData | null = await BookingServices.getBookingById(prep_quote_id);

    if (!booking) {
        console.log()
        notFound();
    }

    // Fetch event details
    let event = null;
    try {
        event = await EventService.getEventByID(booking.eventId);
    } catch {
        // Event not found
    }


    //ya sari subkission hanfdle kareewga
    async function handling_prep_quote(payload: {
        bookingId: string;
        vendorId: string;
        servicePackage: string;
        items: { description: string; quantity: number; unitPrice: number }[];
        taxRate: number;
        discountAmount: number;
        customizations: string[];
        terms: string;
        validityDate: string;
        internalNotes: string;
        totalAmount: number;
        currency: string;
    }) {
        'use server';

        let {
            bookingId,
            items,
            discountAmount,
            terms,
            validityDate,
            totalAmount,
            taxRate
        } = payload;


        terms  = `${terms } . Tax on this is ${taxRate}.`
        // Fetch the booking fresh — don't rely on outer closure scope
        const booking: BookingData | null = await BookingServices.getBookingById(bookingId);
        if (!booking) {
            throw new Error(`Booking not found for id: ${bookingId}`);
        }

        const basePrice = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        const breakdownItems: BreakdownItem[] = items.map(item => ({
            item: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
        }));

        const updatedVendorQuote: VendorQuote = {
            basePrice,
            additionalCharges: booking.quote.vendorQuote?.additionalCharges || [],
            discount: discountAmount,
            totalAmount,
            breakdown: breakdownItems,
            terms: terms ?? "",          // fallback instead of undefined
            validity: validityDate ?? "" // same safety for validityDate
        };


        const updatedBooking: BookingData = {
            ...booking, // Maintain original fields (ids, customer specs, requirements)
            status: "quote_sent",
            quote: {
                ...booking.quote,
                respondedAt: new Date().toISOString(),
                vendorQuote: updatedVendorQuote,
                negotiation: [
                    ...(booking.quote?.negotiation || []),
                    {
                        from: "vendor",
                        message: `Quote prepared. Total: Rs ${totalAmount.toLocaleString()}`,
                        timestamp: new Date().toISOString()
                    }
                ]
            },
            statusHistory: [
                ...(booking.statusHistory || []),
                {
                    status: "quote_sent",
                    timestamp: new Date().toISOString()
                }
            ],
            updatedAt: new Date().toISOString()
        };

        console.log("about to update booking on vendor side");
        await BookingServices.update_booking(updatedBooking);
        console.log("booking updated");
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

    return <PrepareQuoteClient vendorId={vendor_id} initialData={initialData} handling_prep_quote={handling_prep_quote} />;
}