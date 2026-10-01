"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { fail, ok, type ActionResult } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { assertOwnedEvent } from "@/src/features/events/ownership";

async function deleteEventImpl(formData: FormData): Promise<ActionResult> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) return fail("Missing event.");

  const event = await assertOwnedEvent(eventId);
  if (!event) return fail("You cannot delete this event.");

  const { error } = await supabaseAdmin.rpc("admin_purge_event", { target: eventId });
  if (error) {
    console.error("[deleteEvent]", error);
    return fail("Could not delete this event. Try again.");
  }

  revalidatePath(`/organizer/${event.organizerId}/events`);
  revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
  return ok();
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const fallback = organizerId ? `/organizer/${organizerId}/events` : "/organizer";
  finishForm(formData, fallback, await deleteEventImpl(formData), "Event deleted.");
}
