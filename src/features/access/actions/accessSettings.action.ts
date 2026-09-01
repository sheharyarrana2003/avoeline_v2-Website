"use server";

import { revalidatePath } from "next/cache";
import { EventService } from "@/src/services/event.service";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { isAccessType, DEFAULT_ATTENDEE_TIERS } from "../types";

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
 *
 * The first real user of EventService.update_event: until it existed nothing
 * could change an event after creation, so an organizer could not have altered
 * these settings even if the fields had been wired.
 */
export async function saveAccessSettings(
    _prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change access settings for that event.");

        const visibility = String(formData.get("visibility") ?? "").trim().toLowerCase();
        if (!isAccessType(visibility)) return fail("Choose one of the access types.");

        const attendeeTiers = parseLines(formData.get("attendeeTiers"));
        if (!attendeeTiers.length) attendeeTiers.push(...DEFAULT_ATTENDEE_TIERS);

        // Only tiers the event offers can be gated -- a gate on a tier nobody can
        // pick locks nothing and reads as a bug.
        const gatedTiers = parseLines(formData.get("gatedTiers")).filter((t) => attendeeTiers.includes(t));

        const code = String(formData.get("accessCode") ?? "").trim();
        if (code && code.length < 4) return fail("An access code needs at least four characters.");

        await EventService.update_event(eventId, {
            visibility,
            // Empty means "no code", stored as null rather than "" so the read side
            // has one falsy shape to check.
            accessCode: code || null,
            access: {
                attendeeTiers,
                gatedTiers,
                allowTierSelfSelect: formData.get("allowTierSelfSelect") === "on",
                requiresApproval: formData.get("requiresApproval") === "on",
                waitlistEnabled: formData.get("waitlistEnabled") === "on",
            },
        });

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
        // The public page and the browse listing both key off visibility.
        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        return ok();
    } catch (err) {
        console.error("[saveAccessSettings]", err);
        return fail("Could not save those access settings. Please try again.");
    }
}
