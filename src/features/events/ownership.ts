import { AuthService } from "@/src/features/auth/authService";
import { UserService } from "@/src/services/user.service";
import { accountIsLive } from "@/src/features/admin/types";
import { EventService } from "@/src/services/event.service";
import type { EventModel } from "@/src/services/models/event.model";
import { getCollaboratingEventIds } from "@/src/features/organizations/organizations.service";
import { staffCanAct } from "@/src/features/hackathon/staffEventAccess";
import { getRegistrationById } from "@/src/features/registration/registration.service";
import type { Registration } from "@/src/services/models/reg.type";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { canManageOrg } from "@/src/features/department/orgScope";
import {
  isServerActionRequest,
  isSupportPreviewPath,
  isSupportViewer,
} from "@/src/features/admin/supportPreview";

/**
 * "May the signed-in user act on this event as owner/manager?" — organizer,
 * collaborator with full access, department admin, club president, or platform
 * admin. Event staff are NOT admitted here; use `assertEventActor` with a tab.
 *
 * A Server Action is a public HTTP endpoint. Route params are attacker-chosen,
 * and `proxy.ts` only proves the caller is *an* organizer, not *this* one — so
 * an action that trusts an `organizer_id` from the path lets any organizer act
 * on any event whose URL they know.
 *
 * Returns the event on success and null on every failure, deliberately: the
 * caller renders one refusal either way, and distinguishing "no such event"
 * from "not yours" tells a prober which event ids exist.
 */
export async function assertOwnedEvent(eventId: string): Promise<EventModel | null> {
  if (!eventId) return null;

  const current = await AuthService.getCurrentUser();
  if (!current?.userId) return null;

  const asAdmin =
    current.role === "platform_admin" || String(current.userType).trim().toLowerCase() === "admin";
  const asOrganizer = String(current.userType).trim().toLowerCase() === "organizer";
  const asDept = current.role === "department_admin";
  const asPresident = (current.presidentOfOrgIds?.length ?? 0) > 0;

  const event = await EventService.getEventByID(eventId);
  if (!event) return null;

  // Platform admins may view tenant dashboards (support preview), but Server
  // Action mutations while previewing another account are refused (S9).
  if (asAdmin) {
    if (
      isSupportViewer(current) &&
      (await isServerActionRequest()) &&
      (await isSupportPreviewPath(current.userId))
    ) {
      console.warn("[assertOwnedEvent] refused support-preview mutation", {
        eventId,
        caller: current.userId,
      });
      return null;
    }
    return event;
  }

  // The person who created the event can open every hackathon tab even if their
  // session is still typed attendee (club presidents).
  if (String(event.organizerId) === current.userId) {
    if (!accountIsLive((await UserService.getUserById(current.userId)).accountStatus)) {
      console.warn("[assertOwnedEvent] refused a suspended organizer", { caller: current.userId });
      return null;
    }
    return event;
  }

  if (!asOrganizer && !asDept && !asPresident) {
    return null;
  }

  // Spec 9.3: suspended organizers must not mutate via stale action tabs.
  if (!accountIsLive((await UserService.getUserById(current.userId)).accountStatus)) {
    console.warn("[assertOwnedEvent] refused a suspended organizer", { caller: current.userId });
    return null;
  }

  if (asDept) {
    const { data: profile } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("org_id")
      .eq("user_id", event.organizerId)
      .maybeSingle();
    const orgId = String(profile?.org_id || "");
    if (orgId && (await canManageOrg(current, orgId))) return event;
    if (await canManageOrg(current, event.organizerId)) return event;
  }

  // Spec 5.2: invited collaborator with full access.
  const collaborating = await getCollaboratingEventIds(current.userId);
  if (collaborating.includes(eventId)) return event;

  console.warn("[assertOwnedEvent] refused", { eventId, caller: current.userId });
  return null;
}

/**
 * Owner/manager path, or event staff with a grant for `tab` (see STAFF_PAGE_KEYS).
 * Pass a tab for staff-capable mutations (e.g. "attendees", "competitions").
 * Omit `tab` only when the call should stay owner-only (same as assertOwnedEvent).
 */
export async function assertEventActor(
  eventId: string,
  tab?: string,
  trackId?: string | null,
): Promise<EventModel | null> {
  const owned = await assertOwnedEvent(eventId);
  if (owned) return owned;
  if (!tab || !eventId) return null;
  if (!(await staffCanAct(eventId, tab, trackId))) return null;
  return EventService.getEventByID(eventId);
}

/**
 * "Is this caller the participant they claim to be?" -- the other half of the
 * question `assertOwnedEvent` answers, for the surfaces an attendee acts on.
 *
 * There is no session to check. A public registration has no account at all
 * (`Registration.userId === ""`), and the app's answer to that is the ticket
 * link: the registration id is an unguessable UUID, and holding it is
 * what proves who you are. See the docstring on
 * `app/events/[eventId]/ticket/[registrationId]/page.tsx`.
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
