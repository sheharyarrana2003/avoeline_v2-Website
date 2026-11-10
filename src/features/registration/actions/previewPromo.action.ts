"use server";

import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { TicketingService } from "@/src/features/ticketing/ticketing.service";
import { getPublicEvent, isPaidEvent, ticketFor } from "../registration.service";
import { getTrack, listTracks } from "@/src/features/hackathon/hackathon.service";
import { headers } from "next/headers";

/**
 * Preview original / discount / total for the public registration form.
 * Does not redeem or increment usage.
 */
export const previewPromo = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    code: z.string().min(1).max(64),
    trackId: z.string().uuid().optional().nullable(),
    ticketTierId: z.string().uuid().optional().nullable(),
  }),
  run: async (input) => {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const limited = rateLimit(`promo-preview:${input.eventId}:${ip}`, 30, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many promo checks. Try again shortly.");

    const event = await getPublicEvent(input.eventId);
    if (!event) {
      return safeFail("CLOSED", "This event is not open for registration right now.");
    }

    // Promo previews against the base fee only — never stacked on track/student/group discounts.
    const tracks = await listTracks(event.id);
    let listPrice = isPaidEvent(event) ? ticketFor(event).price : 0;
    if (tracks.length) {
      const track =
        tracks.find((t) => t.id === input.trackId) ??
        (input.trackId ? await getTrack(input.trackId) : null);
      if (!track || track.eventId !== event.id) {
        return safeFail("TRACK", "Choose a competition first.");
      }
      listPrice = Number(track.fee) || 0;
    } else if (input.ticketTierId) {
      const tiers = await TicketingService.listTiers(event.id);
      const tier = tiers.find((t) => t.id === input.ticketTierId);
      if (tier) listPrice = tier.price;
    }

    if (listPrice <= 0) {
      return safeOk({
        original: 0,
        discount: 0,
        total: 0,
        code: "",
        currency: event.pricing?.currency || "PKR",
      });
    }

    const preview = await TicketingService.previewPromo(
      event.id,
      input.code,
      listPrice,
      input.trackId ?? null,
    );
    if ("error" in preview) return safeFail("PROMO", preview.error);

    return safeOk({
      original: listPrice,
      discount: preview.discount,
      total: preview.total,
      code: preview.code,
      currency: event.pricing?.currency || "PKR",
    });
  },
});
