"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { assertEventActor } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { isExternalVendorStatus } from "../types";

export async function saveExternalVendorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const event = await assertEventActor(eventId, "vendors");
    if (!event) return fail("You cannot manage vendors for that event.");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Vendor name is required.");
    const statusRaw = String(formData.get("status") ?? "planned").trim();
    if (!isExternalVendorStatus(statusRaw)) return fail("Invalid status.");
    const budgetRaw = String(formData.get("budget") ?? "").trim();
    const budget = budgetRaw === "" ? null : Number(budgetRaw);
    if (budget != null && (Number.isNaN(budget) || budget < 0))
      return fail("Budget must be a non-negative number.");
    const id = String(formData.get("id") ?? "").trim();
    const user = await AuthService.getCurrentUser();
    const now = new Date().toISOString();
    const payload = {
      event_id: eventId,
      name,
      vendor_type: String(formData.get("vendorType") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      budget,
      contact: String(formData.get("contact") ?? "").trim(),
      status: statusRaw,
      updated_at: now,
    };
    if (id) {
      const { error } = await supabaseAdmin
        .from(TABLES.EVENT_EXTERNAL_VENDORS)
        .update(payload)
        .eq("id", id)
        .eq("event_id", eventId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from(TABLES.EVENT_EXTERNAL_VENDORS).insert({
        id: randomUUID(),
        ...payload,
        created_by: user?.userId ?? null,
        created_at: now,
      });
      if (error) throw error;
    }
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/vendors`);
    return ok();
  } catch (err) {
    console.error("[saveExternalVendorAction]", err);
    return fail("Could not save that vendor.");
  }
}

export async function deleteExternalVendorAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const event = await assertEventActor(eventId, "vendors");
  if (!event || !id) return;
  await supabaseAdmin
    .from(TABLES.EVENT_EXTERNAL_VENDORS)
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);
  revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/vendors`);
}
