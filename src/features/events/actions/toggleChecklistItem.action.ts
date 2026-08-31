"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { AuthService } from "@/src/features/auth/authService";

/**
 * Tick one starter-checklist item off, or back on.
 *
 * The whole array is rewritten because that is how this repo stores lists on an
 * event -- agenda.service.ts and speakers.service.ts both do the same. Note it
 * is a targeted `.update()` on one field, not a general event-update path;
 * there still isn't one, and this task is not the place to invent it.
 *
 * The index comes from the form, so it is bounds-checked, and the event is
 * re-read to confirm the caller owns it: a Server Action is a public endpoint,
 * and without the ownership check any signed-in organizer could tick items on
 * somebody else's event.
 */
export async function toggleChecklistItem(formData: FormData): Promise<void> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const index = Number(formData.get("index"));
        if (!eventId || !Number.isInteger(index) || index < 0) return;

        const current = await AuthService.getCurrentUser();
        if (!current?.userId) return;

        const ref = adminDb.collection(COLLECTIONS.EVENTS).doc(eventId);
        const snap = await ref.get();
        if (!snap.exists) return;

        const data = snap.data() ?? {};
        if (String(data.organizerId) !== current.userId) {
            console.warn("[toggleChecklistItem] refused: not the organizer", { eventId });
            return;
        }

        const checklist = Array.isArray(data.checklist) ? [...data.checklist] : [];
        const item = checklist[index];
        if (!item?.label) return;

        checklist[index] = { label: String(item.label), done: !item.done };

        await ref.update({ checklist, updatedAt: new Date() });
        revalidatePath(`/organizer/${current.userId}/events/${eventId}`);
    } catch (err) {
        console.error("[toggleChecklistItem]", err);
    }
}
