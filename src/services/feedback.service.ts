import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";
import { EventFeedback } from "@/src/services/models/feedback.model";

export function mapFeedback(docId: string, data: any): EventFeedback {
    console.log("in mapping this is my raew object ",data)
    return {
        id: docId,
        feedbackId: docId,
        targetId: data.targetId ?? "",
        targetType: data.targetType ?? "event",
        type: data.type ?? "event",
        
        reviewerId: data.reviewerId ?? "",
        reviewerType: data.reviewerType ?? "attendee",
        userId: data.reviewerId,
        
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

export const FeedbackService = {
    async getFeedbackByOrganizer(organizerId: string) : Promise<EventFeedback[]>{
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("organizerId", "==", organizerId)
            .get();

        return snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
    },

    async getFeedbackByEvent(targetId: string): Promise<EventFeedback[]> {
        const snapshot: QuerySnapshot = await adminDb
            .collection(COLLECTIONS.FEEDBACK)
            .where("targetId", "==", targetId)
            .get();

            console.log("in service ",snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data())))
        return snapshot.docs.map((doc) => mapFeedback(doc.id, doc.data()));
    },
};
