"use server";

import { revalidatePath } from "next/cache";
import { EventService } from "@/src/services/event.service";
import { assertOwnedEvent } from "@/src/features/events/ownership";

/**
 * Tick one starter-checklist item off, or back on.
 *
 * The whole array is rewritten because that is how this repo stores lists on an
 * event -- agenda and speakers do the same. Ownership and the write both go
 * through the shared helpers rather than reaching into `adminDb` here, so this
 * action does not have to be trusted to get either right.
 */
export async function toggleChecklistItem(formData: FormData): Promise<void> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const index = Number(formData.get("index"));
        if (!eventId || !Number.isInteger(index) || index < 0) return;

        const event = await assertOwnedEvent(eventId);
        if (!event) return;

        const checklist = Array.isArray(event.checklist) ? [...event.checklist] : [];
        const item = checklist[index];
        if (!item?.label) return;

        checklist[index] = { label: String(item.label), done: !item.done };

        await EventService.update_event(eventId, { checklist });
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
    } catch (err) {
        console.error("[toggleChecklistItem]", err);
    }
}
