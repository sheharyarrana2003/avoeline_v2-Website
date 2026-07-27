import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";
import { EventFeedback } from "@/src/services/models/feedback.model";

export function mapFeedback(docId: string, data: any): EventFeedback {
    return {
        id: docId,
        feedbackId: docId,
        targetId: data.targetId ?? "",
        targetType: data.targetType ?? "event",
        type: data.type ?? "event",

        reviewerId: data.reviewerId ?? "",
        reviewerType: data.reviewerType ?? "attendee",
        userId: data.reviewerId,
        reviewerName: data.reviewerName ?? "",

        organizerId: data.organizerId ?? "",
        bookingId: data.bookingId ?? "",
        eventId: data.eventId ?? "",

        title: data.title ?? "",
        comment: data.comment ?? "",
        rating: Number(data.rating) || 0,
        tags: Array.isArray(data.tags) ? data.tags : [],

        attendedEvent: Boolean(data.attendedEvent),
        usedService: Boolean(data.usedService),
        verifiedPurchase: Boolean(data.verifiedPurchase),
        visibility: data.visibility ?? "public",

        helpfulCount: Number(data.helpfulCount) || 0,
        helpfulUserIds: Array.isArray(data.helpfulUserIds) ? data.helpfulUserIds : [],

        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt ?? "",
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? "",
    };
}

/** Payload for an organizer reviewing a vendor after a completed booking. */
export interface VendorReviewInput {
    vendorId: string;
    organizerId: string;
    bookingId: string;
    eventId?: string;
    rating: number;
    title?: string;
    comment: string;
    reviewerName?: string;
}

export const FeedbackService = {
    async getFeedbackByOrganizer(organizerId: string) : Promise<EventFeedback[]>{
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("organizerId", "==", organizerId)
            // Scoped to event feedback: vendor reviews live in the same collection
            // and also carry an organizerId, so they'd otherwise pollute event analytics.
            .where("targetType", "==", "event")
            .get();

        return snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
    },

    async getFeedbackByEvent(targetId: string): Promise<EventFeedback[]> {
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("targetId", "==", targetId)
            .where("targetType", "==", "event")
            .get();

        return snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
    },

    // ── Vendor reviews (written by organizers, one per completed booking) ──────

    /** Every public review written about a vendor, newest first. */
    async getVendorReviews(vendorId: string): Promise<EventFeedback[]> {
        if (!vendorId) return [];
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("targetId", "==", vendorId)
            .where("targetType", "==", "vendor")
            .get();

        const reviews = snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
        // Sorted in memory: ordering on createdAt alongside two equality filters
        // would need a composite index, and review counts per vendor stay small.
        return reviews.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },

    /** The review for one booking, if the organizer already left one. */
    async getVendorReviewByBooking(bookingId: string): Promise<EventFeedback | null> {
        if (!bookingId) return null;
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("bookingId", "==", bookingId)
            .where("targetType", "==", "vendor")
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return mapFeedback(snapshot.docs[0].id, snapshot.docs[0].data());
    },

    /** Creates the review doc and returns its id. */
    async createVendorReview(input: VendorReviewInput): Promise<string> {
        const ref = await adminDb.collection(COLLECTIONS.FEEDBACK).add({
            targetId: input.vendorId,
            targetType: "vendor",
            type: "vendor",

            reviewerId: input.organizerId,
            reviewerType: "organizer",
            reviewerName: input.reviewerName || "",

            organizerId: input.organizerId,
            bookingId: input.bookingId,
            eventId: input.eventId || "",

            title: input.title || "",
            comment: input.comment,
            rating: input.rating,
            tags: ["vendor_review"],

            attendedEvent: false,
            // The organizer booked and the booking completed, so the service was
            // genuinely used — this is a verified review, not an anonymous one.
            usedService: true,
            verifiedPurchase: true,
            visibility: "public",

            helpfulCount: 0,
            helpfulUserIds: [],

            // Real Firestore Timestamps, matching the app's system-timestamp convention.
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return ref.id;
    },
};
