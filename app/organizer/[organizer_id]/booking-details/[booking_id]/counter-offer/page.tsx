import { BookingServices } from "@/src/features/bookings/bookings.service";
import { NotificationServices } from "@/src/services/notification.services";
import { BookingData } from "@/src/features/bookings/types";
import { NegotiationMessage } from "@/src/features/bookings/types";
import { notFound } from "next/navigation";
import { StatusHistoryEntry } from "@/src/features/bookings/types";
import OrganizerCounterOfferForm from "./ClientCounterOffer";
import { Breadcrumbs } from "@/src/shared_components/ui/Breadcrumbs";


export default async function CounterOfferFormOrganizer({ params }: { params: Promise<{ organizer_id: string, booking_id: string }> }) {

    const { organizer_id, booking_id } = await params;
    const booking: BookingData | null = await BookingServices.getBookingById(booking_id);

    if (!booking) {
        notFound();
    }

    async function onSubmitCounter(targetBudget: number, message: string) {
        'use server'

        // A Server Action is a public endpoint, so the amount is validated here and
        // not only in the form. Sending a negative or zero target is exactly how the
        // booking this page was opened on ended up quoted at PKR -20.
        if (!Number.isFinite(targetBudget) || targetBudget <= 0) {
            throw new Error("A counter-offer must be a positive amount.");
        }

        // Re-read rather than mutating the `booking` captured when this page
        // rendered. update_booking rewrites the whole document, so writing back a
        // copy from render time silently discards anything changed since — and the
        // vendor's quote screen writes to the same document. prep-quote already
        // re-fetches for this reason; this action did not.
        const fresh: BookingData | null = await BookingServices.getBookingById(booking_id);
        if (!fresh) return;

        const negotiation: NegotiationMessage = {
            from: 'organizer',
            message: `Target budget: Rs ${targetBudget.toLocaleString()}. ${message}`.trim(),
            timestamp: new Date()
        }

        const statusEntry: StatusHistoryEntry = {
            status: 'quote_requested',
            timestamp: new Date()
        }

        const updated: BookingData = {
            ...fresh,
            statusHistory: [...(fresh.statusHistory ?? []), statusEntry],
            quote: {
                ...fresh.quote,
                negotiation: [...(fresh.quote?.negotiation ?? []), negotiation],
                vendorQuote: fresh.quote?.vendorQuote
                    ? { ...fresh.quote.vendorQuote, totalAmount: targetBudget }
                    : fresh.quote?.vendorQuote,
            },
            payment: { ...fresh.payment, totalAmount: targetBudget },
        };

        await BookingServices.update_booking(updated);

        await NotificationServices.createNotification({
            userId: fresh.vendorId,
            type: "vendor_quote",
            title: "Counter-offer received",
            message: `The organizer countered with a target budget of Rs ${targetBudget.toLocaleString()}.`,
            deepLink: `/vendor/${fresh.vendorId}/quotes/${fresh.bookingId}`,
        });
    }


    // The form was rendered bare into the layout's <main>, so it sat flush against
    // the top of the viewport with no breathing room on any side.
    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <Breadcrumbs
                items={[
                    { label: "Vendor bookings", href: `/organizer/${organizer_id}/all-vendors` },
                    { label: "Booking", href: `/organizer/${organizer_id}/booking-details/${booking_id}` },
                    { label: "Counter offer" },
                ]}
            />
            <OrganizerCounterOfferForm bookingData={booking} onSubmitCounter={onSubmitCounter} />
        </div>
    )
}