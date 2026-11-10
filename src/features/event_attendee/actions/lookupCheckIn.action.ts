"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { regStatusFromDb, regStatusToDb } from "@/data/statusMaps";
import { AuthService } from "@/src/features/auth/authService";
import { assertEventActor } from "@/src/features/events/ownership";
import { verifyCheckInToken } from "@/src/features/registration/checkInToken";
import { formatShortCode } from "@/src/features/registration/shortCode";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const inputSchema = z.object({
  eventId: z.string().uuid(),
  query: z.string().min(1).max(500),
});

/**
 * Staff check-in by signed QR token or display short code (N4).
 * Rate-limited; organizer / permitted event staff only.
 */
export const lookupAndCheckInAction = safeAction({
  input: inputSchema,
  auth: async () => {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return safeFail("UNAUTHORIZED", "Sign in required.");
    return { userId: user.userId, label: "lookupAndCheckIn" };
  },
  run: async ({ eventId, query }, auth) => {
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "Not allowed.");

    const limited = rateLimit(`checkin-lookup:${auth.userId}:${eventId}`, 60, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMITED", `Too many lookups. Try again in ${limited.retryAfterSec}s.`);
    }

    const raw = String(query || "").trim();
    let registrationId: string | null = null;
    let method: "qr_scan" | "short_code" = "short_code";

    const token = verifyCheckInToken(raw);
    if (token) {
      if (token.eid !== eventId) {
        return safeFail("NOT_FOUND", "That code is not for this event.");
      }
      registrationId = token.rid;
      method = "qr_scan";
    } else {
      const code = formatShortCode(raw);
      if (!code || !/^AVO-[0-9A-Z]{6}$/.test(code)) {
        return safeFail("INVALID", "Enter a short code or scan a valid QR.");
      }
      const { data, error } = await supabaseAdmin
        .from(TABLES.REGISTRATIONS)
        .select("id")
        .eq("event_id", eventId)
        .eq("short_code", code)
        .maybeSingle();
      if (error) throw error;
      registrationId = data?.id ? String(data.id) : null;
      method = "short_code";
    }

    if (!registrationId) {
      return safeFail("NOT_FOUND", "No registration matched that code.");
    }

    const { data: row, error: loadErr } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("id, event_id, status, status_history, short_code, attendee_name, checked_in")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!row) return safeFail("NOT_FOUND", "No registration matched that code.");

    const appStatus = regStatusFromDb(row.status);
    if (appStatus === "cancelled" || appStatus === "rejected") {
      return safeFail("INVALID", `Cannot check in a ${appStatus} registration.`);
    }
    if (appStatus === "waitlisted") {
      return safeFail("INVALID", "Waitlisted registrations cannot check in.");
    }

    if (row.checked_in) {
      return safeOk({
        alreadyCheckedIn: true,
        registrationId: String(row.id),
        shortCode: String(row.short_code || ""),
        name: String(row.attendee_name || ""),
        method,
      });
    }

    const now = new Date().toISOString();
    const history = Array.isArray(row.status_history) ? [...(row.status_history as unknown[])] : [];
    history.push({ status: "checked_in", timestamp: now });

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        status: regStatusToDb("checked_in"),
        status_history: history,
        checked_in: true,
        check_in_time: now,
        check_in_method: method,
        checked_in_by: auth.userId || event.organizerId,
        updated_at: now,
      })
      .eq("id", registrationId);
    if (updateError) throw updateError;

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(String(event.id), ["checkin", "attendees"]);

    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}`);

    return safeOk({
      alreadyCheckedIn: false,
      registrationId: String(row.id),
      shortCode: String(row.short_code || ""),
      name: String(row.attendee_name || ""),
      method,
    });
  },
});
