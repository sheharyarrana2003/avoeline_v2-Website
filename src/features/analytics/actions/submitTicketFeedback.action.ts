"use server";

import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { eventLifecycle } from "@/src/lib/eventState";

const TAGS = ["venue", "speakers", "content", "networking", "organization", "value"] as const;

const schema = z.object({
  eventId: z.string().uuid(),
  registrationId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(""),
  tags: z.array(z.enum(TAGS)).max(6).optional().default([]),
});

export const submitTicketFeedbackAction = safeAction({
  input: schema,
  run: async (input) => {
    const rl = rateLimit(`ticket-feedback:${input.registrationId}`, 5, 3600);
    if (!rl.ok) {
      return safeFail("RATE_LIMIT", `Try again in ${rl.retryAfterSec}s.`);
    }

    const { data: reg, error: regErr } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select(
        "id, event_id, user_id, organizer_id, status, feedback_submitted, attendee_name, attendee_email",
      )
      .eq("id", input.registrationId)
      .maybeSingle();
    if (regErr) throw regErr;
    if (!reg || reg.event_id !== input.eventId) {
      return safeFail("NOT_FOUND", "Registration not found.");
    }
    if (reg.feedback_submitted) {
      return safeFail("ALREADY", "Feedback already submitted for this ticket.");
    }
    if (["cancelled", "rejected"].includes(String(reg.status))) {
      return safeFail("INVALID", "This registration cannot leave feedback.");
    }

    const { data: event, error: evErr } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, status, start_date, start_time, end_date, end_time, timezone, extra")
      .eq("id", input.eventId)
      .maybeSingle();
    if (evErr) throw evErr;
    if (!event) return safeFail("NOT_FOUND", "Event not found.");

    const extra = (event.extra && typeof event.extra === "object" ? event.extra : {}) as Record<
      string,
      unknown
    >;
    const schedule = (
      extra.schedule && typeof extra.schedule === "object" ? extra.schedule : {}
    ) as Record<string, unknown>;
    const life = eventLifecycle(event.status, {
      startDate: (schedule.startDate as string) || event.start_date,
      startTime: (schedule.startTime as string) || event.start_time,
      endDate: (schedule.endDate as string) || event.end_date,
      endTime: (schedule.endTime as string) || event.end_time,
      timezone: (schedule.timezone as string) || event.timezone,
    } as any);
    if (life !== "completed" && life !== "ongoing") {
      return safeFail("TOO_EARLY", "Feedback opens once the event is underway or finished.");
    }

    const now = new Date().toISOString();
    const { data: review, error: reviewErr } = await supabaseAdmin
      .from(TABLES.REVIEWS)
      .insert({
        target_id: input.eventId,
        target_type: "event",
        reviewer_id: reg.user_id || null,
        reviewer_type: "attendee",
        registration_id: input.registrationId,
        rating: input.rating,
        title: "",
        comment: input.comment || "",
        tags: ["event_feedback", ...input.tags],
        attended_event: true,
        used_service: false,
        verified_purchase: false,
        visibility: "public",
        event_id: input.eventId,
        created_at: now,
        updated_at: now,
        extra: {
          type: "event",
          reviewerName: reg.attendee_name || "",
          organizerId: reg.organizer_id || "",
          eventId: input.eventId,
          registrationId: input.registrationId,
        },
      })
      .select("id")
      .single();
    if (reviewErr) {
      if (/reviews_one_per_registration|duplicate/i.test(reviewErr.message)) {
        return safeFail("ALREADY", "Feedback already submitted for this ticket.");
      }
      throw reviewErr;
    }

    const { error: updErr } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        feedback_submitted: true,
        rating: input.rating,
        review_id: review.id,
        updated_at: now,
      })
      .eq("id", input.registrationId);
    if (updErr) throw updErr;

    return safeOk({ reviewId: review.id });
  },
});
