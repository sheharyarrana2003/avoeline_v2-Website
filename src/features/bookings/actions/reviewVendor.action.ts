"use server";

import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { FeedbackService } from "@/src/services/feedback.service";
import { OrganizerService } from "@/src/services/organizer.service";
import { Ratings } from "@/src/services/models/vendor.model";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

export interface SubmitVendorReviewInput {
    bookingId: string;
    organizerId: string;
    vendorId: string;
    rating: number;
    title?: string;
    comment: string;
}

/**
 * Recomputes a vendor's rating aggregate from every review written about them.
 * `vendor.ratings` is read all over the UI (profile, dashboard, marketplace, the
 * organizer's view-vendor breakdown bars) but nothing ever wrote it, so those
 * stars were static defaults until now.
 */
async function recomputeVendorRatings(vendorId: string): Promise<Ratings> {
    const reviews = await FeedbackService.getVendorReviews(vendorId);
    const breakdown: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
    let sum = 0;

    for (const r of reviews) {
        const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
        breakdown[String(star)] = (breakdown[String(star)] || 0) + 1;
        sum += Number(r.rating) || 0;
    }

    const totalReviews = reviews.length;
    return {
        averageRating: totalReviews ? Number((sum / totalReviews).toFixed(1)) : 0,
        totalReviews,
        breakdown,
    };
}

/**
 * An organizer reviews a vendor for one completed booking. Writes the review to
 * the `reviews` collection, stamps the booking (which is what surfaces it to the
 * vendor on their quote detail page), and refreshes the vendor's aggregate.
 */
export async function submitVendorReview(input: SubmitVendorReviewInput): Promise<ActionResult> {
    try {
        const { bookingId, organizerId, vendorId } = input;
        if (!bookingId || !organizerId || !vendorId) {
            return { success: false, error: "Missing booking, organizer or vendor id." };
        }

        const comment = (input.comment || "").trim();
        if (!comment) return { success: false, error: "Please write a few words about the vendor." };

        const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 0)));
        const title = (input.title || "").trim();

        const booking = await BookingServices.getBookingById(bookingId);
        if (!booking) return { success: false, error: "Booking not found." };
        // Only the organizer on the booking may review it, and only once it's done.
        if (booking.organizerId !== organizerId) {
            return { success: false, error: "This booking belongs to another organizer." };
        }
        if (booking.status !== "completed") {
            return { success: false, error: "You can review this vendor once the booking is completed." };
        }

        const existing = await FeedbackService.getVendorReviewByBooking(bookingId);
        if (existing) return { success: false, error: "You have already reviewed this booking." };

        const organizer = await OrganizerService.getOrganizerById(organizerId);

        const reviewId = await FeedbackService.createVendorReview({
            vendorId,
            organizerId,
            bookingId,
            eventId: booking.eventId,
            rating,
            title,
            comment,
            reviewerName: organizer?.organization?.name || "",
        });

        // Targeted field writes: BookingServices.update_booking rewrites the whole
        // document, which would clobber anything changed since this page rendered.
        await adminDb.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update({
            "qualityCheck.organizerCheck": {
                checked: true,
                rating,
                comments: comment,
                checkedAt: new Date(),
            },
            "review.organizerReviewId": reviewId,
            "review.organizerRating": rating,
        });

        const vendor = await EventVendorService.getVendorById(vendorId);
        if (vendor) {
            const ratings = await recomputeVendorRatings(vendorId);
            // Vendor docs are keyed by the auth uid (== vendor.userId), while
            // getVendorById looks them up by the vendorId *field*.
            const docId = vendor.userId || vendorId;
            await adminDb.collection(COLLECTIONS.VENDORS).doc(docId).update({ ratings });
        }

        revalidatePath(`/organizer/${organizerId}/booking-details/${bookingId}`);
        revalidatePath(`/organizer/${organizerId}/view-vendor/${vendorId}`);
        revalidatePath(`/organizer/${organizerId}/vendor-marketplace`);
        revalidatePath(`/vendor/${vendorId}/profile`);
        revalidatePath(`/vendor/${vendorId}/dashboard`);

        return { success: true };
    } catch (err: any) {
        console.error("[reviewVendor]", err);
        return { success: false, error: err?.message ?? "Failed to submit the review." };
    }
}
