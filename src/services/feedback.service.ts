import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { EventFeedback } from "@/src/services/models/feedback.model";

type ReviewRow = {
  id: string;
  target_id: string;
  target_type: string;
  reviewer_id: string;
  reviewer_type: string | null;
  title: string | null;
  comment: string | null;
  rating: number;
  tags: string[] | null;
  attended_event: boolean | null;
  used_service: boolean | null;
  verified_purchase: boolean | null;
  visibility: string | null;
  helpful_count: number | null;
  helpful_user_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  extra: Record<string, unknown> | null;
};

export function mapFeedback(
  docId: string,
  data: Record<string, unknown> | ReviewRow,
): EventFeedback {
  const row = data as ReviewRow & Record<string, unknown>;
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<
    string,
    unknown
  >;
  const targetId = String(row.target_id ?? row.targetId ?? "");
  const targetType = String(row.target_type ?? row.targetType ?? "event");
  const reviewerId = String(row.reviewer_id ?? row.reviewerId ?? "");

  return {
    id: docId,
    feedbackId: docId,
    targetId,
    targetType: targetType as EventFeedback["targetType"],
    type: String(extra.type ?? row.type ?? targetType) as EventFeedback["type"],

    reviewerId,
    reviewerType: String(
      row.reviewer_type ?? row.reviewerType ?? "attendee",
    ) as EventFeedback["reviewerType"],
    userId: reviewerId,
    reviewerName: String(extra.reviewerName ?? row.reviewerName ?? ""),

    organizerId: String(extra.organizerId ?? row.organizerId ?? ""),
    bookingId: String(extra.bookingId ?? row.bookingId ?? ""),
    eventId: String(extra.eventId ?? row.eventId ?? ""),

    title: String(row.title ?? ""),
    comment: String(row.comment ?? ""),
    rating: Number(row.rating) || 0,
    tags: Array.isArray(row.tags) ? row.tags : [],

    attendedEvent: Boolean(row.attended_event ?? row.attendedEvent),
    usedService: Boolean(row.used_service ?? row.usedService),
    verifiedPurchase: Boolean(row.verified_purchase ?? row.verifiedPurchase),
    visibility: String(row.visibility ?? "public") as EventFeedback["visibility"],

    helpfulCount: Number(row.helpful_count ?? row.helpfulCount) || 0,
    helpfulUserIds: Array.isArray(row.helpful_user_ids)
      ? row.helpful_user_ids
      : Array.isArray(row.helpfulUserIds)
        ? (row.helpfulUserIds as string[])
        : [],

    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

/**
 * `reviews` has no organizer column: event reviews point at the event through
 * `target_id`, so an organizer's reviews are the ones on events they own.
 */
export async function fetchOrganizerEventReviewRows(organizerId: string): Promise<ReviewRow[]> {
  if (!organizerId) return [];
  const { data: events, error: eventsError } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("id")
    .eq("organizer_id", organizerId);
  if (eventsError) throw eventsError;
  const eventIds = (events ?? []).map((d) => d.id).filter(Boolean);
  if (!eventIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from(TABLES.REVIEWS)
    .select("*")
    .eq("target_type", "event")
    .in("target_id", eventIds);
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
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
  async getFeedbackByOrganizer(organizerId: string): Promise<EventFeedback[]> {
    const rows = await fetchOrganizerEventReviewRows(organizerId);
    return rows.map((row) => mapFeedback(row.id, row));
  },

  async getFeedbackByEvent(targetId: string): Promise<EventFeedback[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.REVIEWS)
      .select("*")
      .eq("target_id", targetId)
      .eq("target_type", "event");
    if (error) throw error;
    return (data ?? []).map((row) => mapFeedback(row.id, row as ReviewRow));
  },

  // ── Vendor reviews (written by organizers, one per completed booking) ──────

  /** Every public review written about a vendor, newest first. */
  async getVendorReviews(vendorId: string): Promise<EventFeedback[]> {
    if (!vendorId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.REVIEWS)
      .select("*")
      .eq("target_id", vendorId)
      .eq("target_type", "vendor");
    if (error) throw error;

    const reviews = (data ?? []).map((row) => mapFeedback(row.id, row as ReviewRow));
    // Sorted in memory: ordering on createdAt alongside two equality filters
    // would need a composite index, and review counts per vendor stay small.
    return reviews.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  /** The review for one booking, if the organizer already left one. */
  async getVendorReviewByBooking(bookingId: string): Promise<EventFeedback | null> {
    if (!bookingId) return null;
    const { data, error } = await supabaseAdmin
      .from(TABLES.REVIEWS)
      .select("*")
      .eq("target_type", "vendor");
    if (error) throw error;
    const row = (data ?? []).find((r) => {
      const extra = (r.extra && typeof r.extra === "object" ? r.extra : {}) as Record<
        string,
        unknown
      >;
      return String(extra.bookingId || "") === bookingId;
    }) as ReviewRow | undefined;
    if (!row) return null;
    return mapFeedback(row.id, row);
  },

  /** Creates the review doc and returns its id. */
  async createVendorReview(input: VendorReviewInput): Promise<string> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from(TABLES.REVIEWS)
      .insert({
        target_id: input.vendorId,
        target_type: "vendor",
        reviewer_id: input.organizerId,
        reviewer_type: "organizer",
        title: input.title || "",
        comment: input.comment,
        rating: input.rating,
        tags: ["vendor_review"],
        attended_event: false,
        // The organizer booked and the booking completed, so the service was
        // genuinely used — this is a verified review, not an anonymous one.
        used_service: true,
        verified_purchase: true,
        visibility: "public",
        helpful_count: 0,
        helpful_user_ids: [],
        created_at: now,
        updated_at: now,
        extra: {
          type: "vendor",
          reviewerName: input.reviewerName || "",
          organizerId: input.organizerId,
          bookingId: input.bookingId,
          eventId: input.eventId || "",
        },
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },
};
