"use server";

import { revalidatePath } from "next/cache";
import { EventService } from "@/src/services/event.service";
import { assertEventActor } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { isAccessType, DEFAULT_ATTENDEE_TIERS } from "../types";
import { toDbVisibility } from "../lib/accessVisibility";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

/** One item per line, blanks dropped, duplicates collapsed, order kept. */
function parseLines(value: unknown): string[] {
  const seen = new Set<string>();
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()));
}

/**
 * Save an event's access configuration (spec 2.1, 2.2).
 * Persists visibility as DB check values (`vip_tiered`) and access flags in `extra.access`.
 */
export async function saveAccessSettings(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const event = await assertEventActor(eventId, "access");
    if (!event) return fail("You cannot change access settings for that event.");

    let visibilityRaw = String(formData.get("visibility") ?? "")
      .trim()
      .toLowerCase();
    if (visibilityRaw === "vip_tiered") visibilityRaw = "tiered";
    if (!isAccessType(visibilityRaw)) return fail("Choose one of the access types.");

    const dbVisibility = toDbVisibility(visibilityRaw);

    const attendeeTiers = parseLines(formData.get("attendeeTiers"));
    if (!attendeeTiers.length) attendeeTiers.push(...DEFAULT_ATTENDEE_TIERS);

    const gatedTiers = parseLines(formData.get("gatedTiers")).filter((t) =>
      attendeeTiers.includes(t),
    );

    const code = String(formData.get("accessCode") ?? "").trim();
    if (code && code.length < 4) return fail("An access code needs at least four characters.");

    const allowTiersSelfSelect = formData.get("allowTiersSelfSelect") === "on";
    const requiresApproval = formData.get("requiresApproval") === "on";
    const waitlistEnabled = formData.get("waitlistEnabled") === "on";

    const { data: row } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("extra")
      .eq("id", eventId)
      .maybeSingle();
    const prevExtra =
      row?.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
        ? (row.extra as Record<string, unknown>)
        : {};

    const nextExtra = {
      ...prevExtra,
      access: {
        accessType: dbVisibility,
        attendeeTiers,
        gatedTiers,
        allowTiersSelfSelect,
        requiresApproval,
        waitlistEnabled,
      },
    };

    await EventService.update_event(eventId, {
      visibility: dbVisibility,
      accessCode: code || null,
      waitlistEnabled,
      approvalRequired: requiresApproval,
      extra: nextExtra,
    });

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    return ok();
  } catch (err) {
    console.error("[saveAccessSettings]", err);
    return fail("Could not save those access settings. Please try again.");
  }
}
