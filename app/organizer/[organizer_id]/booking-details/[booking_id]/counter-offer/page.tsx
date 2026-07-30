import { BookingServices } from "@/src/features/bookings/bookings.service";
import { NotificationServices } from "@/src/services/notification.services";
import { BookingData } from "@/src/features/bookings/types";
import { NegotiationMessage } from "@/src/features/bookings/types";
import { notFound, redirect } from "next/navigation";
import { StatusHistoryEntry } from "@/src/features/bookings/types";
import OrganizerCounterOfferForm from "./ClientCounterOffer";


export default async function CounterOfferFormOrganizer({ params }: { params: Promise<{ organizer_id: string, booking_id: string }> }) {

    const { organizer_id, booking_id } = await params;
    console.log("ENTERED PAGE", booking_id)
    const booking: BookingData | null = await BookingServices.getBookingById(booking_id);

    if (!booking) {
        console.log("booking not found in counter-offer form");
        notFound();
    } else {
        console.log("Dipplaying tyhe booking");
    }

    async function onSubmitCounter(targetBudget: number, message: string) {
        'use server'
        const message_String = `This is target Budget from organizer ${targetBudget}. ${message}`;

        const new_neg_message: NegotiationMessage = {
            from: 'organizer',
            message: message_String,
            timestamp: new Date()
        }

        const new_status_history: StatusHistoryEntry = {
            status: 'quote_requested',
            timestamp: new Date()
        }

        booking?.statusHistory.push(new_status_history);
        booking?.quote.negotiation.push(new_neg_message);

        if (booking && booking.quote.vendorQuote) {
            booking.quote.vendorQuote.totalAmount = targetBudget;
        }
        if (booking?.payment?.totalAmount) {
            booking.payment.totalAmount = targetBudget
        }
        await BookingServices.update_booking(booking);

        // `booking` was read server-side above, so its vendorId is trustworthy.
        if (booking) {
            await NotificationServices.createNotification({
                userId: booking.vendorId,
                type: "vendor_quote",
                title: "Counter-offer received",
                message: `The organizer countered with a target budget of Rs ${targetBudget.toLocaleString()}.`,
                deepLink: `/vendor/${booking.vendorId}/quotes/${booking.bookingId}`,
            });
        }
    }


    return (
        <>
            <OrganizerCounterOfferForm bookingData={booking} onSubmitCounter={onSubmitCounter} />
        </>
    )
}