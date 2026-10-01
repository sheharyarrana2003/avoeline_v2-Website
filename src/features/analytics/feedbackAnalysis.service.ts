import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { callGemini } from "@/src/services/ai.service";
import { FeedbackService } from "@/src/services/feedback.service";
import { EventFeedback, EventFeedbackAnalysisRow } from "@/src/services/models/feedback.model";
import { QueryDocumentSnapshot } from "@/data/admin_db";


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
    const [eventsSnap, feedbacks] = await Promise.all([
        adminDb
            .collection(COLLECTIONS.EVENTS)
            .where("organizerId", "==", organizerId)
            .get(),
        FeedbackService.getFeedbackByOrganizer(organizerId),
    ]);

    const eventNames: Record<string, string> = {};
    eventsSnap.docs.forEach((doc: QueryDocumentSnapshot) => {
        eventNames[doc.id] = doc.data().title || "Untitled Event";
    });

    const byEvent: Record<string, EventFeedback[]> = {};
    for (const feedback of feedbacks) {
        if (!feedback.targetId) continue;
        (byEvent[feedback.targetId] ??= []).push(feedback);
    }

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
