import { toDate } from "@/src/lib/datetime";
import type { BookingData } from "@/src/features/bookings/types";

/**
 * What a booking is worth, and when it became worth it.
 *
 * The vendor dashboard reported revenue by summing bookings with status
 * "completed" — a status nothing in this app ever writes — so it was arithmetic
 * over an empty set and read Rs 0 forever.
 *
 * An accepted quote is real money: the organizer agreed the price. What it is NOT
 * is money received. The model has `payment.paymentSchedule`, an array of
 * installments each carrying an amount, a due date and a paid/pending status —
 * and it is written as `[]` at creation and never populated. So the product tracks
 * no payments at all, and any figure claiming cash collected would be invented.
 *
 * Hence: booked value. Agreed, owed, and real. Label it as such rather than
 * calling it revenue.
 */

/** Statuses at or past the point the organizer agreed the price. */
const BOOKED_STATUSES = new Set(["quote_accepted", "confirmed", "in_progress", "completed"]);

export function isBooked(booking: Pick<BookingData, "status">): boolean {
    return BOOKED_STATUSES.has(String(booking?.status || "").toLowerCase());
}

/**
 * What the vendor actually keeps, after the platform's cut. Falls back to the
 * gross when no commission was recorded — an older booking, not a free one.
 */
export function vendorNetValue(booking: BookingData): number {
    return (
        Number(booking?.payment?.commission?.vendorReceives) ||
        Number(booking?.payment?.totalAmount) ||
        Number(booking?.quote?.vendorQuote?.totalAmount) ||
        0
    );
}

/** The agreed price before commission. */
export function grossValue(booking: BookingData): number {
    return (
        Number(booking?.payment?.totalAmount) ||
        Number(booking?.quote?.vendorQuote?.totalAmount) ||
        0
    );
}

/**
 * When the quote was accepted.
 *
 * `accept_quote` sets `status` and pushes a `statusHistory` entry with a
 * timestamp, but never stamps `confirmedAt` — so the history is the only record
 * of when this happened. Falls back to the document's own confirmedAt/updatedAt
 * for anything written by a path that did set them.
 */
export function bookedAt(booking: BookingData): Date | null {
    const entry = (booking?.statusHistory ?? [])
        .filter((s) => String(s?.status || "").toLowerCase() === "quote_accepted")
        .map((s) => toDate(s?.timestamp))
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];

    return entry ?? toDate(booking?.confirmedAt) ?? toDate(booking?.updatedAt) ?? null;
}
