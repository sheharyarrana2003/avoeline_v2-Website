// app/vendor/[vendor_id]/quotes/prep-quote/[prep_quote_id]/page.tsx
// Server Component - handles data fetching

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { NotificationServices } from "@/src/services/notification.services";
import { formatDate } from "@/src/lib/datetime";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import PrepareQuoteClient from "@/src/features/bookings/shared_components/VendorPrepBookingClient";

import {
    BookingData,
    BreakdownItem,
    VendorQuote,
    Communication,
    Documents,
} from "@/src/features/bookings/types";

import { VendorData } from "@/src/services/models/vendor.model";

// --- Types for Server Props ---
interface PageParams {
    vendor_id: string;
    prep_quote_id: string;
}

// --- Types for Serialized Data Passed to Client ---

interface SerializedVendorService {
    id: string;
    name: string;
    description: string;
    basePrice: number;
}

interface SerializedEventDetails {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    guestCount: number;
    /** True for fields the request left blank that fall back to the event's own
     *  schedule/venue, so the UI can say where the value came from. */
    fromEvent: {
        date: boolean;
        startTime: boolean;
        endTime: boolean;
        location: boolean;
    };
}

interface SerializedExistingQuote {
    basePrice: number;
    additionalCharges: { description: string; amount: number }[];
    discount: number;
    totalAmount: number;
    breakdown: { item: string; quantity: number; unitPrice: number; total: number }[];
    terms: string;
    validity: string;
}

interface SerializedRequirements {
    description: string;
    serviceDate: string;
    startTime: string;
    endTime: string;
    location: string;
    guestCount: number;
    specialInstructions: string;
}

interface SerializedInitialData {
    bookingId: string;
    eventId: string;
    eventDetails: SerializedEventDetails;
    organizerId: string;
    organizerName: string;
    requirements: SerializedRequirements;
    existingQuote: SerializedExistingQuote | null;
    currency: string;
    communications: Communication[];
    documents: Documents;
    vendorServices: SerializedVendorService[];
    status: string;
}

// --- Server Action Payload Type ---
interface PrepQuotePayload {
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
}

export default async function PrepareQuotePage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const { vendor_id, prep_quote_id } = await params;

    // Fetch booking data on server using the prep_quote_id (which IS the bookingId)
    const booking: BookingData | null = await BookingServices.getBookingById(prep_quote_id);

    // Fetch vendor details and services regardless of booking existence
    let vendor: VendorData | null = null;
    try {
        vendor = await EventVendorService.getVendorById(vendor_id);
    } catch {
        // Vendor not found
    }

    // Extract vendor services
    const vendorServices: SerializedVendorService[] =
        vendor?.services?.map((service: any) => ({
            id: String(service?.id || service?._id || ""),
            name: String(service?.name || "Unnamed Service"),
            description: String(service?.description || ""),
            basePrice: Number(service?.basePrice || service?.price || 0),
        })) || [];

    // If booking exists, fetch event and build full data
    let eventDetails: SerializedEventDetails = {
        title: "New Event",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        guestCount: 0,
        fromEvent: { date: false, startTime: false, endTime: false, location: false },
    };
    let organizerName = "Unknown Organizer";
    let requirements: SerializedRequirements = {
        description: "",
        serviceDate: "",
        startTime: "",
        endTime: "",
        location: "",
        guestCount: 0,
        specialInstructions: "",
    };
    let existingQuote: SerializedExistingQuote | null = null;
    let currency = "PKR";
    let communications: Communication[] = [];
    let documents: Documents = {
        quotePdf: null,
        invoicePdf: null,
        receiptPdf: null,
    };
    let status = "quote_requested";

    if (booking) {
        // Fetch event details
        let event = null;
        try {
            event = await EventService.getEventByID(booking.eventId);
        } catch {
            // Event not found
        }

        // This panel is labelled "Original Request", so what the organizer actually
        // asked for wins; the event's own schedule is only a fallback for fields the
        // request left blank. Previously the event won, so the page showed the event
        // date and the event's total seats instead of the requested date and guest
        // count — figures the organizer never typed.
        const req = booking.requirements;
        eventDetails = {
            title: event?.title || "New Event",
            date: req?.serviceDate || event?.schedule?.startDate || "",
            startTime: req?.startTime || event?.schedule?.startTime || "",
            endTime: req?.endTime || event?.schedule?.endTime || "",
            location: req?.location || event?.location?.venueName || "",
            // Never borrow the event's capacity here: an unanswered guest count is
            // unknown, not "however many seats the event has".
            guestCount: Number(req?.guestCount) || 0,
            // Flag anything the organizer didn't actually state, so the panel can
            // attribute it to the event instead of presenting it as the request.
            fromEvent: {
                date: !req?.serviceDate && Boolean(event?.schedule?.startDate),
                startTime: !req?.startTime && Boolean(event?.schedule?.startTime),
                endTime: !req?.endTime && Boolean(event?.schedule?.endTime),
                location: !req?.location && Boolean(event?.location?.venueName),
            },
        };

        organizerName =
            event?.organizerId || booking.organizerId || "Unknown Organizer";

        requirements = {
            description: booking.requirements?.description || "",
            serviceDate: booking.requirements?.serviceDate || "",
            startTime: booking.requirements?.startTime || "",
            endTime: booking.requirements?.endTime || "",
            location: booking.requirements?.location || "",
            guestCount: booking.requirements?.guestCount || 0,
            specialInstructions: booking.requirements?.specialInstructions || "",
        };

        existingQuote = booking.quote?.vendorQuote
            ? {
                  basePrice: booking.quote.vendorQuote.basePrice || 0,
                  additionalCharges:
                      booking.quote.vendorQuote.additionalCharges || [],
                  discount: booking.quote.vendorQuote.discount || 0,
                  totalAmount: booking.quote.vendorQuote.totalAmount || 0,
                  breakdown: booking.quote.vendorQuote.breakdown || [],
                  terms: booking.quote.vendorQuote.terms || "",
                  validity: booking.quote.vendorQuote.validity || "",
              }
            : null;

        currency = booking.payment?.currency || "PKR";
        communications = booking.communications || [];
        documents = booking.documents || {
            quotePdf: null,
            invoicePdf: null,
            receiptPdf: null,
        };
        status = booking.status || "quote_requested";
    }

    // Server action to handle quote submission
    async function handling_prep_quote(payload: PrepQuotePayload): Promise<void> {
        "use server";

        let {
            bookingId,
            items,
            discountAmount,
            terms,
            validityDate,
            totalAmount,
            taxRate,
        } = payload;

        terms = `${terms}. Tax on this is ${taxRate}.`;

        // Fetch the booking fresh — don't rely on outer closure scope
        const freshBooking: BookingData | null =
            await BookingServices.getBookingById(bookingId);

        if (!freshBooking) {
            throw new Error(`Booking not found for id: ${bookingId}`);
        }

        const basePrice = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );

        // totalAmount arrives from the client and was written through untouched. A
        // Server Action is a public endpoint, and the client also computes it as
        // base + charges - discount + tax, so a discount larger than the base sends
        // a negative straight into the booking. Live data has a quote of PKR -20,
        // which then deadlocked the organizer's counter-offer form: its two rules are
        // "greater than zero" and "less than the current total", and no number is
        // both. Reject it here rather than let it reach Firestore.
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            throw new Error("A quote total must be a positive amount.");
        }
        if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > basePrice) {
            throw new Error("A discount cannot be negative or exceed the base price.");
        }

        const breakdownItems: BreakdownItem[] = items.map((item) => ({
            item: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
        }));

        const updatedVendorQuote: VendorQuote = {
            basePrice,
            additionalCharges:
                freshBooking.quote?.vendorQuote?.additionalCharges || [],
            discount: discountAmount,
            totalAmount,
            breakdown: breakdownItems,
            terms: terms ?? "",
            validity: validityDate ? formatDate(validityDate) : "",
        };

        const updatedBooking: BookingData = {
            ...freshBooking,
            status: "quote_sent",
            quote: {
                ...freshBooking.quote,
                respondedAt: new Date(),
                vendorQuote: updatedVendorQuote,
                negotiation: [
                    ...(freshBooking.quote?.negotiation || []),
                    {
                        from: "vendor",
                        message: `Quote prepared. Total: Rs ${totalAmount.toLocaleString()}`,
                        timestamp: new Date(),
                    },
                ],
            },
            statusHistory: [
                ...(freshBooking.statusHistory || []),
                {
                    status: "quote_sent",
                    timestamp: new Date(),
                },
            ],
            updatedAt: new Date(),
        };  
        
        if (updatedBooking?.payment?.totalAmount) {
            updatedBooking.payment.totalAmount = totalAmount
        }

        await BookingServices.update_booking(updatedBooking);

        // Awaited, and before the redirect below: an un-awaited promise would be
        // killed when the response is sent. createNotification never throws, so
        // this cannot fail the write above.
        await NotificationServices.createNotification({
            userId: freshBooking.organizerId,
            type: "vendor_quote",
            title: "New quote received",
            message: `A vendor sent a quote of Rs ${totalAmount.toLocaleString()}.`,
            deepLink: `/organizer/${freshBooking.organizerId}/quotes?quote=${bookingId}`,
        });

        // Send the vendor back to their quotes list instead of leaving them on a
        // form they've already submitted, and refresh the views whose status changed.
        revalidatePath(`/vendor/${vendor_id}/quotes`);
        revalidatePath(`/vendor/${vendor_id}/dashboard`);
        revalidatePath(`/organizer/${freshBooking.organizerId}/quotes`);
        redirect(`/vendor/${vendor_id}/quotes`);
    }

    // Serialize data for client component
    const initialData: SerializedInitialData = {
        bookingId: prep_quote_id,
        eventId: booking?.eventId || "",
        eventDetails,
        organizerId: booking?.organizerId || "",
        organizerName,
        requirements,
        existingQuote,
        currency,
        communications,
        documents,
        vendorServices,
        status,
    };

    return (
        <PrepareQuoteClient
            vendorId={vendor_id}
            initialData={initialData}
            handling_prep_quote={handling_prep_quote}
        />
    );
}