import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { callGemini } from "@/src/services/ai.service";
import { FeedbackService } from "@/src/services/feedback.service";
import { EventFeedbackAnalysisRow } from "./types";
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
    const [feedbacks, eventsSnap] = await Promise.all([
        FeedbackService.getFeedbackByOrganizer(organizerId),
        adminDb
            .collection(COLLECTIONS.EVENTS)
            .where("organizerId", "==", organizerId)
            .get(),
    ]);

    const eventNames: Record<string, string> = {};
    eventsSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        eventNames[doc.id] = doc.data().title || "Untitled Event";
    });

    const byEvent: Record<string, typeof feedbacks> = {};
    feedbacks.forEach((feedback) => {
        if (!feedback.eventId) return;
        if (!byEvent[feedback.eventId]) {
            byEvent[feedback.eventId] = [];
        }
        byEvent[feedback.eventId].push(feedback);
    });

    const results: EventFeedbackAnalysisRow[] = [];

    for (const [eventId, eventFeedbacks] of Object.entries(byEvent)) {
        const feedbackText = eventFeedbacks
            .map(
                (feedback, index) =>
                    `Feedback ${index + 1}: Rating: ${feedback.rating ?? "N/A"}, Comment: ${feedback.comment || "No comment"}`
            )
            .join("\n");

        const prompt = `Analyze the following attendee feedback for an event on the Avoeline platform.

Event ID: ${eventId}
Event Name: ${eventNames[eventId] ?? "Unknown Event"}
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

        const aiResponses = await callGemini(prompt);
        const parsed = parseAiAnalysis(aiResponses.join("\n"));

        results.push({
            eventId,
            eventName: eventNames[eventId] ?? "Unknown Event",
            feedbackCount: eventFeedbacks.length,
            ...parsed,
        });
    }

    return results;
}
