"use server";

import { BookingServices, patchBookingFields } from "@/src/features/bookings/bookings.service";
import {
  EventVendorService,
  patchVendorProfile,
} from "@/src/features/event_vendors/event_venders.services";
import { FeedbackService } from "@/src/services/feedback.service";
import { OrganizerService } from "@/src/services/organizer.service";
import { Ratings } from "@/src/services/models/vendor.model";
import { requireSelfOrAdmin } from "@/src/lib/assertSession";
import {
  isServerActionRequest,
  isSupportPreviewPath,
  isSupportViewer,
} from "@/src/features/admin/supportPreview";
import { AuthService } from "@/src/features/auth/authService";
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

    const gate = await requireSelfOrAdmin(organizerId);
    if (!gate.ok) return { success: false, error: gate.error };
    const me = await AuthService.getCurrentUser();
    if (
      me &&
      isSupportViewer(me) &&
      (await isServerActionRequest()) &&
      (await isSupportPreviewPath(me.userId))
    ) {
      return { success: false, error: "Support preview is read-only." };
    }

    const comment = (input.comment || "").trim();
    if (!comment) return { success: false, error: "Please write a few words about the vendor." };

    const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 0)));
    const title = (input.title || "").trim();

    const booking = await BookingServices.getBookingById(bookingId);
    if (!booking) return { success: false, error: "Booking not found." };
    // Session owner must be the booking organizer (client organizerId is not trusted alone).
    if (booking.organizerId !== gate.userId && !gate.isAdmin) {
      return { success: false, error: "This booking belongs to another organizer." };
    }
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
    const checkedAt = new Date().toISOString();
    const qualityCheck = {
      ...(booking.qualityCheck || {}),
      organizerCheck: {
        checked: true,
        rating,
        comments: comment,
        checkedAt,
      },
    };
    const review = {
      ...(booking.review || {}),
      organizerReviewId: reviewId,
      organizerRating: rating,
    };
    await patchBookingFields(bookingId, { organizer_rating: rating }, { qualityCheck, review });

    const vendor = await EventVendorService.getVendorById(vendorId);
    if (vendor) {
      const ratings = await recomputeVendorRatings(vendorId);
      const docId = vendor.userId || vendorId;
      await patchVendorProfile(
        docId,
        {
          average_rating: ratings.averageRating,
          total_reviews: ratings.totalReviews,
        },
        { ratings },
      );
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
