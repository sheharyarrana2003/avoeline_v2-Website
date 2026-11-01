import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { FeedbackService } from "@/src/services/feedback.service";
import {
  analyzeFeedbackWithGemini,
  type GeminiAnalysisResult,
  type FeedbackCommentInput,
} from "./geminiFeedback";

export type OrganizerFeedbackAnalysis = GeminiAnalysisResult & {
  eventId: string | null;
  eventName: string | null;
};

/**
 * Load reviews for an organizer (optionally one event) and run Gemini / fallback analysis.
 */
export async function analyzeOrganizerFeedback(
  organizerId: string,
  opts?: { eventId?: string | null; forceRefresh?: boolean },
): Promise<OrganizerFeedbackAnalysis> {
  const eventId = opts?.eventId ?? null;

  const [{ data: events, error }, feedbacks] = await Promise.all([
    supabaseAdmin.from(TABLES.EVENTS).select("id, title").eq("organizer_id", organizerId),
    FeedbackService.getFeedbackByOrganizer(organizerId),
  ]);
  if (error) throw error;

  const names = new Map<string, string>();
  for (const ev of events ?? []) names.set(ev.id, ev.title || "Untitled Event");

  const scoped = feedbacks.filter((f) => {
    const tid = f.targetId || f.eventId || "";
    if (!tid) return false;
    if (eventId) return tid === eventId;
    return true;
  });

  const comments: FeedbackCommentInput[] = scoped.map((f) => ({
    rating: Number(f.rating) || 0,
    comment: String(f.comment || ""),
    tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
    eventId: f.targetId || f.eventId,
    eventName: names.get(f.targetId || f.eventId || "") || undefined,
  }));

  const analysis = await analyzeFeedbackWithGemini({
    organizerId,
    comments,
    eventId,
    forceRefresh: opts?.forceRefresh,
  });

  return {
    ...analysis,
    eventId,
    eventName: eventId ? (names.get(eventId) ?? null) : null,
  };
}
