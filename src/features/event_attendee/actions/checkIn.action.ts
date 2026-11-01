"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { regStatusToDb, regStatusFromDb } from "@/data/statusMaps";
import { assertEventActor } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";

/**
 * Check an attendee in, or undo it.
 *
 * Nothing in the app set this before. `CheckInInfo` has existed on every
 * registration since they were first written — checkedIn, checkInTime,
 * checkInMethod, checkedInBy — initialized to false/null and never touched
 * again, so the check-in tile read 0% permanently, the check-in log had no rows
 * to export, and "issue certificates to everyone who checked in" had an empty
 * input set. The shape was waiting for a writer.
 *
 * Narrow on purpose. The existing attendee editor hands a whole client-supplied
 * Registration object to RegService.updateReg; this takes an id and a boolean,
 * so the only thing a caller can influence is which registration and which
 * direction — the timestamp and the operator come from the server.
 */
export async function setCheckIn(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const checkedIn = String(formData.get("checkedIn")) === "true";
    if (!registrationId) return fail("Missing registration.");

    const { data: row, error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("id, event_id, status, status_history")
      .eq("id", registrationId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return fail("That registration no longer exists.");

    // The registration names its event; the event names its owner. Checking
    // someone in is an organizer action on their own event, so authorization
    // is resolved from stored data rather than anything the caller sent.
    const event = await assertEventActor(String(row.event_id ?? ""), "attendees");
    if (!event) return fail("You cannot check in attendees for that event.");

    const appStatus = regStatusFromDb(row.status);
    if (appStatus === "cancelled") return fail("That registration was cancelled.");

    const now = new Date().toISOString();
    const history = Array.isArray(row.status_history) ? [...(row.status_history as unknown[])] : [];

    // Undoing restores whatever they were before, not a hardcoded
    // "confirmed": someone checked in while still awaiting payment would
    // otherwise come back marked paid-up, which is a worse lie than the
    // mistaken check-in it is meant to correct.
    const previousStatus = [...history]
      .reverse()
      .map((entry) => {
        const e = entry as { status?: string } | null;
        return String(e?.status ?? "");
      })
      .find((status) => status && status !== "checked_in");

    const nextStatus = checkedIn ? "checked_in" : previousStatus || "confirmed";
    history.push({ status: nextStatus, timestamp: now });

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        status: regStatusToDb(nextStatus),
        status_history: history,
        checked_in: checkedIn,
        check_in_time: checkedIn ? now : null,
        check_in_method: checkedIn ? "manual" : null,
        checked_in_by: checkedIn ? event.organizerId : null,
        updated_at: now,
      })
      .eq("id", registrationId);
    if (updateError) throw updateError;

    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}`);
    return ok();
  } catch (err) {
    console.error("[setCheckIn]", err);
    return fail("Could not update check-in. Please try again.");
  }
}
