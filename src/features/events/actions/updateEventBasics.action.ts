"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { EventService } from "@/src/services/event.service";
import { formatTime } from "@/src/lib/datetime";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const schema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().max(50000).optional().default(""),
  shortDescription: z.string().max(500).optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  bannerImage: z.string().optional().default(""),
  galleryImages: z.array(z.string()).optional().default([]),
  totalSeats: z.number().int().min(0).max(1_000_000),
  unlimitedSeats: z.boolean().optional().default(false),
  ticketType: z.enum(["free", "paid"]),
  ticketPrice: z.number().min(0).max(10_000_000).optional().default(0),
});

export type UpdateEventBasicsInput = z.infer<typeof schema>;

export const updateEventBasics = safeAction({
  input: schema,
  auth: async () => ({ label: "updateEventBasics" }),
  run: async (input) => {
    const event = await assertOwnedEvent(input.eventId);
    if (!event) return safeFail("FORBIDDEN", "You cannot edit this event.");

    const seats = input.unlimitedSeats ? 0 : input.totalSeats;
    const isFree = input.ticketType === "free";
    const price = isFree ? 0 : Math.max(0, Number(input.ticketPrice) || 0);
    const existingPricing =
      event.pricing && typeof event.pricing === "object"
        ? { ...event.pricing }
        : { currency: "PKR", tiers: [] };
    const pricing = {
      ...existingPricing,
      isFree,
      currency: existingPricing.currency || "PKR",
      tiers: isFree
        ? []
        : Array.isArray(existingPricing.tiers) && existingPricing.tiers.length
          ? existingPricing.tiers.map((t, i) =>
              i === 0 ? { ...t, price, name: t.name || "General" } : t,
            )
          : [{ name: "General", price, seats, availableUntil: "", description: "" }],
    };

    try {
      await EventService.update_event(input.eventId, {
        title: input.title,
        description: input.description,
        shortDescription: input.shortDescription,
        startDate: input.startDate,
        endDate: input.endDate || input.startDate,
        startTime: input.startTime ? formatTime(input.startTime) : event.schedule?.startTime || "",
        endTime: input.endTime ? formatTime(input.endTime) : event.schedule?.endTime || "",
        bannerImage: input.bannerImage || "",
        galleryImages: (input.galleryImages ?? []).filter(
          (u) => typeof u === "string" && u.length > 0,
        ),
        totalSeats: seats,
        available_seats: seats > 0 ? Math.max(0, seats - (event.capacity?.reservedSeats ?? 0)) : 0,
        isFree,
        pricing,
      });
    } catch (err) {
      console.error("[updateEventBasics]", err);
      return safeFail("WRITE", "Could not save event changes.");
    }

    revalidatePath(`/organizer/${event.organizerId}/events`);
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}`);
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/edit`);
    return safeOk({ eventId: input.eventId });
  },
});
