"use server";

import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { TicketingService } from "../ticketing.service";

async function owned(eventId: string) {
  const event = await assertOwnedEvent(eventId);
  if (!event) return null;
  return event;
}

export async function createTicketTierAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  const event = await owned(eventId);
  if (!event) return fail("Not allowed.");
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  if (!name) return fail("Name is required.");
  try {
    const seatsRaw = String(formData.get("seats") || "").trim();
    const seatsNum = seatsRaw ? Number(seatsRaw) : NaN;
    await TicketingService.createTier(eventId, {
      name,
      price,
      seatsAvailable: Number.isFinite(seatsNum) && seatsNum > 0 ? seatsNum : null,
      availableFrom: String(formData.get("availableFrom") || "").trim() || null,
      availableUntil: String(formData.get("availableUntil") || "").trim() || null,
      isEarlyBird: formData.get("isEarlyBird") === "on",
      active: formData.get("active") === "on",
    });
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
    return ok();
  } catch (e) {
    console.error(e);
    return fail("Could not save the ticket tier.");
  }
}

export async function createPromoCodeAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  const event = await owned(eventId);
  if (!event) return fail("Not allowed.");
  const code = String(formData.get("code") || "").trim();
  const discountType = String(formData.get("discountType") || "percent") as "percent" | "flat";
  const value = Number(formData.get("value") || 0);
  if (!code) return fail("Code is required.");
  try {
    const trackId = String(formData.get("trackId") || "").trim();
    const usageRaw = String(formData.get("usageLimit") || "").trim();
    const usageNum = usageRaw ? Number(usageRaw) : NaN;
    await TicketingService.createPromo(eventId, {
      code,
      discountType,
      value,
      trackId: trackId || null,
      usageLimit: Number.isFinite(usageNum) && usageNum > 0 ? usageNum : undefined,
      expiresAt: String(formData.get("expiresAt") || "").trim() || null,
      active: formData.get("active") === "on",
    });
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
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/access`,
    await createTicketTierAction(eventId, formData),
    "Ticket tier added.",
  );
}

export async function createPromoCode(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/access`,
    await createPromoCodeAction(eventId, formData),
    "Promo code added.",
  );
}

export async function toggleTicketTier(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "on";
  const event = await owned(eventId);
  const result = !event
    ? fail("Not allowed.")
    : await TicketingService.updateTier(eventId, id, { active })
        .then(() => ok())
        .catch(() => fail("Could not update the tier."));
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/access`,
    result,
    active ? "Tier activated." : "Tier deactivated.",
  );
}

export async function deleteTicketTier(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const id = String(formData.get("id") || "");
  const event = await owned(eventId);
  const result = !event
    ? fail("Not allowed.")
    : await TicketingService.deleteTier(eventId, id)
        .then(() => ok())
        .catch(() => fail("Could not delete the tier."));
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/access`,
    result,
    "Tier deleted.",
  );
}

export async function togglePromoCode(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "on";
  const event = await owned(eventId);
  const result = !event
    ? fail("Not allowed.")
    : await TicketingService.updatePromo(eventId, id, { active })
        .then(() => ok())
        .catch(() => fail("Could not update the code."));
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/access`,
    result,
    active ? "Code activated." : "Code deactivated.",
  );
}

export async function deletePromoCode(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const id = String(formData.get("id") || "");
  const event = await owned(eventId);
  const result = !event
    ? fail("Not allowed.")
    : await TicketingService.deletePromo(eventId, id)
        .then(() => ok())
        .catch(() => fail("Could not delete the code."));
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/access`,
    result,
    "Promo code deleted.",
  );
}
