import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";

export interface EventFeedback {
    feedbackId: string;
    eventId: string;
    organizerId: string;
    userId?: string;
    rating?: number;
    comment: string;
    createdAt?: string;
}

function mapFeedback(docId: string, raw: Record<string, unknown>): EventFeedback {
    const answers = raw.answers ?? raw.responses;
    const commentFromAnswers =
        answers && typeof answers === "object"
            ? JSON.stringify(answers)
            : "";

    return {
        feedbackId: docId,
        eventId: String(raw.eventId ?? ""),
        organizerId: String(raw.organizerId ?? ""),
        userId: raw.userId ? String(raw.userId) : undefined,
        rating:
            raw.rating !== undefined && raw.rating !== null
                ? Number(raw.rating)
                : undefined,
        comment: String(
            raw.comment ??
                raw.text ??
                raw.message ??
                raw.feedback ??
                commentFromAnswers ??
                ""
        ),
        createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    };
}

export const FeedbackService = {
    async getFeedbackByOrganizer(organizerId: string): Promise<EventFeedback[]> {
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("organizerId", "==", organizerId)
            .get();

        return snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
    },

    async getFeedbackByEvent(eventId: string): Promise<EventFeedback[]> {
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("eventId", "==", eventId)
            .get();

        return snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
    },
};
