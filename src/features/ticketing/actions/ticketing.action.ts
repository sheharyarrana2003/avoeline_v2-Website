"use server";

import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { TicketingService } from "../ticketing.service";

export async function createTicketTierAction(eventId: string, formData: FormData): Promise<ActionResult> {
  const event = await assertOwnedEvent(eventId);
  if (!event) return fail("Not allowed.");
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  if (!name) return fail("Name is required.");
  try {
    await TicketingService.createTier(eventId, { name, price, seatsAvailable: Number(formData.get("seats")) || undefined });
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
    return ok();
  } catch (e) {
    console.error(e);
    return fail("Could not save the ticket tier.");
  }
}

export async function createPromoCodeAction(eventId: string, formData: FormData): Promise<ActionResult> {
  const event = await assertOwnedEvent(eventId);
  if (!event) return fail("Not allowed.");
  const code = String(formData.get("code") || "").trim();
  const discountType = String(formData.get("discountType") || "percent") as "percent" | "flat";
  const value = Number(formData.get("value") || 0);
  if (!code) return fail("Code is required.");
  try {
    const trackId = String(formData.get("trackId") || "").trim();
    await TicketingService.createPromo(eventId, { code, discountType, value, trackId: trackId || null });
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
    return ok();
  } catch (e) {
    console.error(e);
    return fail("Could not save the promo code.");
  }
}

export async function createTicketTier(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  finishForm(formData, `/organizer/${organizerId}/events/${eventId}/access`, await createTicketTierAction(eventId, formData), "Ticket tier added.");
}

export async function createPromoCode(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  finishForm(formData, `/organizer/${organizerId}/events/${eventId}/access`, await createPromoCodeAction(eventId, formData), "Promo code added.");
}
