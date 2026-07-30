import { BookingServices } from "@/src/features/bookings/bookings.service";
import { NotificationServices } from "@/src/services/notification.services";
import { BookingData } from "@/src/features/bookings/types";
import { NegotiationMessage } from "@/src/features/bookings/types";
import { notFound, redirect } from "next/navigation";
import { StatusHistoryEntry } from "@/src/features/bookings/types";
import VendorCounterOfferForm from "./VendorCounterOffer";



export default async function CounterOfferFormOrganizer({ params }: { params: Promise<{ vendor_id: string, booking_id: string }> }) {

    const { vendor_id, booking_id } = await params;
    const booking: BookingData | null = await BookingServices.getBookingById(booking_id);

    if (!booking) {
        console.log("booking not found in counter-offer form");
        notFound();
    } else {
        console.log("Dipplaying tyhe booking");
    }

    async function onSubmitCounter(targetBudget: number, message: string) {
        'use server'
        // "from vendor": this is the vendor's own counter-offer. The organizer twin
        // of this page says "from organizer"; this side was a copy-paste that left
        // the wrong role in the text the other party reads.
        const message_String = `This is target Budget from vendor ${targetBudget}. ${message}`;

        const new_neg_message: NegotiationMessage = {
            from: 'vendor',
            message: message_String,
            timestamp: new Date()
        }

        const new_status_history: StatusHistoryEntry = {
            status: 'quote_sent',
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

        // `booking` was read server-side above, so its organizerId is trustworthy.
        if (booking) {
            await NotificationServices.createNotification({
                userId: booking.organizerId,
                type: "vendor_quote",
                title: "Counter-offer received",
                message: `A vendor countered with Rs ${targetBudget.toLocaleString()}.`,
                deepLink: `/organizer/${booking.organizerId}/quotes?quote=${booking.bookingId}`,
            });
        }
    }


    return (
        <>
            <VendorCounterOfferForm bookingData={booking} onSubmitCounter={onSubmitCounter} />
        </>
    )
}