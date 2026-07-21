import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { callGemini } from "@/src/services/ai.service";
import { FeedbackService } from "@/src/services/feedback.service";
import { EventFeedback, EventFeedbackAnalysisRow } from "@/src/services/models/feedback.model";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";


function parseAiAnalysis(raw: string) {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = (fenced?.[1] ?? raw).trim();

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            summary: String(parsed.summary ?? "—"),
            strengths: String(parsed.strengths ?? "—"),
            improvements: String(parsed.improvements ?? "—"),
            sentiment: String(parsed.sentiment ?? "Mixed"),
        };
    } catch {
        return {
            summary: raw.slice(0, 200) || "—",
            strengths: "—",
            improvements: "—",
            sentiment: "Mixed",
        };
    }
}

export async function analyzeOrganizerFeedback(
    organizerId: string
): Promise<EventFeedbackAnalysisRow[]> {
    //incase if there is a direct key in schema of reviews of organzuer id
    // const [feedbacks, eventsSnap] = await Promise.all([
    //     FeedbackService.getFeedbackByOrganizer(organizerId),
    //     adminDb
    //         .collection(COLLECTIONS.EVENTS)
    //         .where("organizerId", "==", organizerId)
    //         .get(),
    // ]);
    console.log("Start of feeedbacks");

    const [eventsSnap] = await Promise.all([

        adminDb
            .collection(COLLECTIONS.EVENTS)
            .where("organizerId", "==", organizerId)
            .get(),
    ]);


    const eventNames: Record<string, string> = {};
    eventsSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        eventNames[doc.id] = doc.data().title || "Untitled Event";
    });

    // 1. Map entries to an array of pending promises
    const feedbackPromises = Object.entries(eventNames).map(async ([key, value]) => {
        return await FeedbackService.getFeedbackByEvent(key);
    });

    // 2. Await all promises concurrently
    // feedbacks -> EventFeedback[][]
    const feedbacks = await Promise.all(feedbackPromises);
    console.log("these are all the feedbacks ", feedbacks)


    //for every event all the feedbacks are in an array
    const byEvent: Record<string, EventFeedback[]> = {};

    feedbacks.forEach((feedback) => {
        if (feedback.length === 0) {
            return;
        }

        const targetId = feedback[0]?.targetId;
        if (!targetId) return;

        // if (!byEvent[targetId]) {
        //     byEvent[targetId] = [];
        // }
        byEvent[feedback[0].targetId] = feedback;
    });

    const results: EventFeedbackAnalysisRow[] = [];

    for (const [targetId, eventFeedbacks] of Object.entries(byEvent)) {

        const feedbackText = eventFeedbacks
            .map((f, index) => `Feedback ${index + 1}: Rating: ${f.rating ?? "N/A"}, Comment: ${f.comment || "No comment"}`)
            .join("\n");

        const prompt = `Analyze the following attendee feedback for an event on the Avoeline platform.

Event ID: ${targetId}
Event Name: ${eventNames[targetId] ?? "Unknown Event"}
Number of feedback responses: ${eventFeedbacks.length}

Feedback data:
${feedbackText}

Provide a concise analysis for the event organizer. Return ONLY valid JSON (no markdown) with exactly these keys:
{
  "summary": "one sentence overall summary",
  "strengths": "comma-separated key strengths",
  "improvements": "comma-separated areas to improve",
  "sentiment": "Positive" | "Mixed" | "Negative"
}`;

        console.log("prompt ============");
        console.log(prompt);
        const aiResponses = await callGemini(prompt);
        const parsed = parseAiAnalysis(aiResponses.join("\n"));

        results.push({
            eventId: targetId,
            eventName: eventNames[targetId] ?? "Unknown Event",
            feedbackCount: eventFeedbacks.length,
            ...parsed,
        });
    }
    return results;
}
