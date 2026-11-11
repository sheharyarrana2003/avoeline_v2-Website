import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { isWithinRegistrationDates } from "@/src/lib/publicEventStatus";
import { logger } from "@/src/lib/logger";

export type RegistrationEligibleEvent = {
  id: string;
  organizerId: string;
  status: string;
  requiresRegistration: boolean;
  schedule: { startDate?: string; endDate?: string } | null;
};

export type RegistrationEligibilityFail = {
  ok: false;
  code: "NOT_FOUND" | "NO_REGISTRATION" | "CLOSED" | "INVALID_ID";
  /** Attendee-safe message */
  message: string;
  status: 400 | 404;
};

export type RegistrationEligibilityOk = {
  ok: true;
  event: RegistrationEligibleEvent;
};

/**
 * Shared gate for public registration submit and proof upload.
 * Draft / completed / cancelled / archived → CLOSED (not a fake "not found").
 * Missing row or DB error → NOT_FOUND (DB errors logged, never leaked).
 */
export async function assertPublicRegistrationEvent(
  eventId: string,
): Promise<RegistrationEligibilityOk | RegistrationEligibilityFail> {
  const id = String(eventId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return {
      ok: false,
      code: "INVALID_ID",
      message: "We couldn't find this event. Refresh the page and try again.",
      status: 400,
    };
  }

  const { data: event, error: eventErr } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select(
      "id, organizer_id, status, requires_registration, schedule, registration_open_date, registration_close_date, timezone",
    )
    .eq("id", id)
    .maybeSingle();

  if (eventErr) {
    logger.error("[assertPublicRegistrationEvent]", { code: eventErr.code });
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "We couldn't find this event. Refresh the page and try again.",
      status: 404,
    };
  }
  if (!event) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "We couldn't find this event. Refresh the page and try again.",
      status: 404,
    };
  }

  if (event.requires_registration === false) {
    return {
      ok: false,
      code: "NO_REGISTRATION",
      message: "This event does not take registrations.",
      status: 400,
    };
  }

  const schedule = (event.schedule || {}) as {
    startDate?: string;
    endDate?: string;
    timezone?: string;
  };
  if (!isActiveLifecycle(eventLifecycle(String(event.status || ""), schedule))) {
    return {
      ok: false,
      code: "CLOSED",
      message: "This event is not open for registration right now.",
      status: 400,
    };
  }

  const tz =
    String(schedule.timezone || "").trim() ||
    String((event as { timezone?: string | null }).timezone || "").trim() ||
    null;
  if (
    !isWithinRegistrationDates(
      {
        registrationOpenDate: event.registration_open_date,
        registrationCloseDate: event.registration_close_date,
        timezone: tz,
      },
      new Date(),
    )
  ) {
    return {
      ok: false,
      code: "CLOSED",
      message: "This event is not open for registration right now.",
      status: 400,
    };
  }

  return {
    ok: true,
    event: {
      id: String(event.id),
      organizerId: String(event.organizer_id),
      status: String(event.status || ""),
      requiresRegistration: event.requires_registration !== false,
      schedule,
    },
  };
}
