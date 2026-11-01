"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { fail } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { assertOwnedEvent } from "@/src/features/events/ownership";

const SKIP_COLS = new Set([
  "id",
  "created_at",
  "updated_at",
  "published_at",
  "archived_at",
  "deleted_at",
  "registrations_count",
]);

export async function duplicateEvent(formData: FormData): Promise<void> {
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const fallback = organizerId ? `/organizer/${organizerId}/events` : "/organizer";

  if (!eventId) {
    finishForm(formData, fallback, fail("Missing event."), "");
    return;
  }

  const owned = await assertOwnedEvent(eventId);
  if (!owned) {
    finishForm(formData, fallback, fail("You cannot duplicate this event."), "");
    return;
  }

  const { data: src, error: readErr } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (readErr || !src) {
    console.error("[duplicateEvent] read", readErr);
    finishForm(formData, fallback, fail("Could not load the event to duplicate."), "");
    return;
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src as Record<string, unknown>)) {
    if (SKIP_COLS.has(key)) continue;
    payload[key] = value;
  }

  const baseTitle = String(src.title || "Untitled event").trim() || "Untitled event";
  payload.title = baseTitle.startsWith("Copy of ") ? baseTitle : `Copy of ${baseTitle}`;
  payload.status = "draft";
  payload.published_at = null;
  payload.archived_at = null;

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .insert(payload)
    .select("id")
    .single();

  if (insertErr || !inserted?.id) {
    console.error("[duplicateEvent] insert", insertErr);
    finishForm(formData, fallback, fail("Could not duplicate this event."), "");
    return;
  }

  revalidatePath(`/organizer/${owned.organizerId}/events`);
  redirect(`/organizer/${owned.organizerId}/events/${inserted.id}`);
}
