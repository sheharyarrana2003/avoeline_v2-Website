import { AuthService } from "@/src/features/auth/authService";
import { EventService } from "@/src/services/event.service";
import type { EventModel } from "@/src/services/models/event.model";

/**
 * "Is the signed-in user the organizer of this event?" — the check every
 * mutating event action has to make, in one place.
 *
 * A Server Action is a public HTTP endpoint. Route params are attacker-chosen,
 * and `proxy.ts` only proves the caller is *an* organizer, not *this* one — so
 * an action that trusts an `organizer_id` from the path lets any organizer act
 * on any event whose URL they know. That is exactly how certificate generation
 * came to be able to spend another organizer's funds.
 *
 * Returns the event on success and null on every failure, deliberately: the
 * caller renders one refusal either way, and distinguishing "no such event"
 * from "not yours" tells a prober which event ids exist.
 */
export async function assertOwnedEvent(eventId: string): Promise<EventModel | null> {
    if (!eventId) return null;

    const current = await AuthService.getCurrentUser();
    if (!current?.userId) return null;
    if (String(current.userType).trim().toLowerCase() !== "organizer") return null;

    const event = await EventService.getEventByID(eventId);
    if (!event) return null;

    // Organizer route ids are the auth uid (vendors are the odd one out, and
    // vendors never own events), so this compares like with like.
    if (String(event.organizerId) !== current.userId) {
        console.warn("[assertOwnedEvent] refused", { eventId, caller: current.userId });
        return null;
    }

    return event;
}
