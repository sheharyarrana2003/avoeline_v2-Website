"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { EventService } from "@/src/services/event.service";

async function setEventArchiveStatus(
  formData: FormData,
  status: "archived" | "published",
): Promise<ActionResult> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) return fail("Missing event.");

  const event = await assertOwnedEvent(eventId);
  if (!event) return fail("You cannot change this event.");

  const patch: Record<string, unknown> = { status };
  if (status === "archived") {
    patch.archived_at = new Date().toISOString();
  } else {
    patch.archived_at = null;
    if (!event.publishedAt) {
      patch.published_at = new Date().toISOString();
    }
  }

  try {
    await EventService.update_event(eventId, patch);
  } catch (err) {
    console.error("[archiveEvent]", err);
    return fail(
      status === "archived" ? "Could not archive this event." : "Could not restore this event.",
    );
  }

  revalidatePath(`/organizer/${event.organizerId}/events`);
  revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
  return ok();
}

async function archiveEventImpl(formData: FormData): Promise<ActionResult> {
  return setEventArchiveStatus(formData, "archived");
}

async function restoreEventImpl(formData: FormData): Promise<ActionResult> {
  return setEventArchiveStatus(formData, "published");
}

export async function archiveEvent(formData: FormData): Promise<void> {
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const fallback = organizerId
    ? eventId
      ? `/organizer/${organizerId}/events/${eventId}`
      : `/organizer/${organizerId}/events`
    : "/organizer";
  finishForm(formData, fallback, await archiveEventImpl(formData), "Event archived.");
}

export async function restoreEvent(formData: FormData): Promise<void> {
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const fallback = organizerId
    ? eventId
      ? `/organizer/${organizerId}/events/${eventId}`
      : `/organizer/${organizerId}/events`
    : "/organizer";
  finishForm(formData, fallback, await restoreEventImpl(formData), "Event restored.");
}
