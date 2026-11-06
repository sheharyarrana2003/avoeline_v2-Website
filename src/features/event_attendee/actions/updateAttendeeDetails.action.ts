"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { EventService } from "@/src/services/event.service";
import { hydrateRegistrationRow, mapToRegistration } from "@/src/services/registeration.service";
import { sendOrganizerEmail } from "@/src/features/event_attendee/eventEmail.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const customAnswerValue = z.union([z.string().max(2000), z.number(), z.boolean()]);

const schema = z.object({
  eventId: z.string().uuid(),
  registrationId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email.").max(320),
  phone: z.string().trim().max(40).optional().default(""),
  customAnswers: z.record(z.string().max(80), customAnswerValue).optional(),
  resendConfirmation: z.boolean().optional().default(false),
});

export const updateAttendeeDetailsAction = safeAction({
  input: schema,
  run: async (input) => {
    const event = await assertOwnedEvent(input.eventId);
    if (!event) return safeFail("FORBIDDEN", "You cannot edit attendees for that event.");

    const { data: row, error: readError } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select(
        "id, event_id, user_id, organizer_id, attendee_name, attendee_email, attendee_phone, custom_responses, extra, status, communications, status_history, qr_code_data, qr_code_image_url, payment_status, amount_paid, final_price, pricing_tier, tier, waitlist_position, invite_id, registration_source, checked_in, check_in_time, check_in_method, checked_in_by, payment_proof_path, certificate_issued, certificate_id, feedback_submitted, rating, review_id, cancelled_at, group_id, created_at, updated_at",
      )
      .eq("id", input.registrationId)
      .eq("event_id", input.eventId)
      .maybeSingle();

    if (readError) throw readError;
    if (!row) return safeFail("NOT_FOUND", "That registration is not on this event.");

    const extra =
      row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
        ? { ...(row.extra as Record<string, unknown>) }
        : {};
    const prevAnswers =
      row.custom_responses &&
      typeof row.custom_responses === "object" &&
      !Array.isArray(row.custom_responses)
        ? { ...(row.custom_responses as Record<string, string | number | boolean>) }
        : {};

    // Merge only keys the client sent (zod-validated). Other answers stay untouched.
    const allowlistedAnswers: Record<string, string | number | boolean> = {
      ...prevAnswers,
      ...(input.customAnswers ?? {}),
    };

    const attendee = {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone || "",
    };

    const { error: writeError } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        attendee_name: attendee.name,
        attendee_email: attendee.email,
        attendee_phone: attendee.phone || null,
        custom_responses: allowlistedAnswers,
        extra: { ...extra, attendee },
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.registrationId)
      .eq("event_id", input.eventId);

    if (writeError) throw writeError;

    let resent = false;
    if (input.resendConfirmation) {
      const fullEvent = (await EventService.getEventByID(input.eventId)) ?? event;
      const registration = mapToRegistration(
        hydrateRegistrationRow({
          ...(row as Record<string, unknown>),
          attendee_name: attendee.name,
          attendee_email: attendee.email,
          attendee_phone: attendee.phone || null,
          custom_responses: allowlistedAnswers,
          extra: { ...extra, attendee },
        }),
        input.registrationId,
      );
      resent = await sendOrganizerEmail({
        registration,
        event: fullEvent,
        kind: "registration_confirmed",
        skipIfSent: false,
      });
      if (!resent) {
        revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
        return safeFail(
          "EMAIL_FAILED",
          "Details were saved, but the confirmation email could not be sent. Connect Google under Organizer → Email.",
        );
      }
    }

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(input.eventId, ["attendees"]);

    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    return safeOk({
      registrationId: input.registrationId,
      attendee,
      customAnswers: allowlistedAnswers,
      resent,
    });
  },
});
