"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { ActionResult, fail } from "@/src/lib/action";
import { createPublicRegistration, getPublicEvent } from "../registration.service";
import { RegistrationRefusal } from "../types";

/**
 * What each refusal reads like to the person who just pressed the button.
 *
 * The service returns a reason code rather than a sentence so this stays the only
 * place wording lives, and so the service never has to care about phrasing.
 */
const REFUSAL_MESSAGE: Record<RegistrationRefusal, string> = {
    event_not_found: "This event is no longer open for registration.",
    event_closed: "Registration for this event has closed.",
    event_full: "This event is fully booked.",
    already_registered: "That email address is already registered for this event.",
};

/** Deliberately permissive. The real proof an address works is the email arriving. */
function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Register an attendee who has no account.
 *
 * Bound-arg-first signature: `bind(null, eventId)` leaves `(prevState, formData)`
 * for `useActionState`. Getting that order wrong is the classic way this pattern
 * breaks, and it fails at runtime rather than at compile time.
 *
 * This is a public endpoint by design -- no session, no role check. What replaces
 * authorization is that a caller can only ever create a registration against an
 * event the gate already accepts, and can supply nothing beyond their own contact
 * details. Every consequential field (price, tier, status, organizer) is derived
 * server-side from the event, never taken from the form.
 */
export async function registerAttendeeAction(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const name = String(formData.get("name") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const phone = String(formData.get("phone") ?? "").trim();

        if (!name || !email || !phone) {
            return fail("Please fill in your name, email and phone number.");
        }
        if (name.length > 120) {
            return fail("That name is too long.");
        }
        if (!looksLikeEmail(email)) {
            return fail("That email address does not look right.");
        }

        // Re-check the event here rather than trusting the page that rendered the
        // form: it may have been open when the page loaded and closed since.
        const event = await getPublicEvent(eventId);
        if (!event) return fail(REFUSAL_MESSAGE.event_not_found);

        const headerList = await headers();
        const result = await createPublicRegistration(
            eventId,
            { name, email, phone },
            {
                metadata: {
                    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
                    userAgent: headerList.get("user-agent") ?? "",
                    deviceType: /mobile|android|iphone/i.test(headerList.get("user-agent") ?? "")
                        ? "mobile"
                        : "desktop",
                },
            },
        );

        if (!result.ok) return fail(REFUSAL_MESSAGE[result.refusal]);

        // So the organizer's attendee list shows the new registration rather than a
        // cached page without it.
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);

        redirect(`/events/${eventId}/ticket/${result.registrationId}`);
    } catch (err) {
        // redirect() reports itself by throwing. Swallowing it here would leave the
        // attendee staring at a form that appears to have done nothing.
        if (isRedirectError(err)) throw err;
        console.error("[registerAttendeeAction]", err);
        return fail("Something went wrong while registering you. Please try again.");
    }
}
