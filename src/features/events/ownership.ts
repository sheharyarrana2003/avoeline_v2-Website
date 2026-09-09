import { AuthService } from "@/src/features/auth/authService";
import { UserService } from "@/src/services/user.service";
import { accountIsLive } from "@/src/features/admin/types";
import { EventService } from "@/src/services/event.service";
import type { EventModel } from "@/src/services/models/event.model";
import { getCollaboratingEventIds } from "@/src/features/organizations/organizations.service";
import { getRegistrationById } from "@/src/features/registration/registration.service";
import type { Registration } from "@/src/services/models/reg.type";

/**
 * "May the signed-in user act on this event?" — the check every mutating event
 * action has to make, in one place.
 *
 * True for the event's own organizer, and for a collaborator who was invited and
 * accepted with full access.
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

    // Spec 9.3, the half a read path cannot cover. Hiding a suspended
    // organizer's public events and blocking their dashboard still leaves a
    // form already open in a stale tab able to POST to a Server Action, because
    // an action does not re-render the layout that turned them away. Every
    // organizer action that mutates an event comes through here, so one check
    // closes all of them at once.
    if (!accountIsLive((await UserService.getUserById(current.userId)).accountStatus)) {
        console.warn("[assertOwnedEvent] refused a suspended organizer", { caller: current.userId });
        return null;
    }

    const event = await EventService.getEventByID(eventId);
    if (!event) return null;

    // Organizer route ids are the auth uid (vendors are the odd one out, and
    // vendors never own events), so this compares like with like.
    if (String(event.organizerId) === current.userId) return event;

    // Spec 5.2: an invited collaborator who has accepted gets dashboard access
    // scoped by their role. Only `full` counts here -- a track-scoped
    // collaborator has nothing to be scoped to until tracks exist, and handing
    // them the whole dashboard in the meantime would be the wrong default.
    const collaborating = await getCollaboratingEventIds(current.userId);
    if (collaborating.includes(eventId)) return event;

    console.warn("[assertOwnedEvent] refused", { eventId, caller: current.userId });
    return null;
}

/**
 * "Is this caller the participant they claim to be?" -- the other half of the
 * question `assertOwnedEvent` answers, for the surfaces an attendee acts on.
 *
 * There is no session to check. A public registration has no account at all
 * (`Registration.userId === ""`), and the app's answer to that is the ticket
 * link: the registration id is an unguessable Firestore id, and holding it is
 * what proves who you are. See the docstring on
 * `app/events/[eventId]/ticket/[registrationId]/page.tsx`.
 *
 * So the credential is the id, and this function is what stops it being the
 * *only* thing checked. It re-reads both documents server-side and refuses
 * unless the pair genuinely belongs together -- the same guard the ticket page
 * makes inline, lifted out because a Server Action is a public endpoint reachable
 * without ever loading that page. Every action that mutates a team, a roster or
 * a submission goes through here first, and takes the registration id from its
 * own bound argument rather than from a form field a caller could swap.
 *
 * Returns null on every failure, deliberately: distinguishing "no such
 * registration" from "wrong event" would tell someone probing ids which of the
 * two they got right.
 */
export async function assertParticipant(
    eventId: string,
    registrationId: string,
): Promise<{ event: EventModel; registration: Registration } | null> {
    if (!eventId || !registrationId) return null;

    const [registration, event] = await Promise.all([
        getRegistrationById(registrationId).catch(() => null),
        EventService.getEventByID(eventId).catch(() => null),
    ]);

    if (!registration || !event) return null;
    if (String(registration.eventId) !== String(event.id)) {
        console.warn("[assertParticipant] refused a mismatched pair", { eventId, registrationId });
        return null;
    }

    // A withdrawn registration is not a participant. Waitlisted people are:
    // they hold no seat, but they can still tag their skills and look for a
    // team in case a place frees up, which is the whole point of the waitlist.
    if (registration.status === "cancelled" || registration.status === "rejected") return null;

    return { event, registration };
}
