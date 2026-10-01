"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { CertificateTemplateService, initialTemplate } from "@/src/services/certificate.template.services";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { applyDesign, isDesignId } from "@/src/features/certificates/designs";
import { type ActionResult, fail, ok } from "@/src/lib/action";

/**
 * Restyle one event's certificate template to a preset design.
 *
 * The design id arrives in the FormData (one submit button per design), the
 * event id is bound server-side. Ownership is checked here and not only on the
 * page: a Server Action is a public endpoint, and `proxy.ts` proves the caller
 * is *an* organizer, not this event's.
 *
 * Bound-arg-first signature -- `bind(null, eventId)` leaves `(prevState,
 * formData)` for `useActionState`. Getting that order wrong fails at runtime
 * rather than at compile time.
 *
 * Overwrites the styling and keeps the wording. The organizer can then edit
 * anything in the template editor, which is the surface this feeds.
 */
export async function applyCertificateDesign(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const design = String(formData.get("design") ?? "");
        if (!isDesignId(design)) return fail("Pick one of the designs.");

        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change that event's certificate.");

        // Keyed by EVENT id, despite the parameter name -- all three callers of
        // this service pass an event id, and event creation seeds a template
        // under the new event's id. The name is legacy, the behaviour is
        // per-event.
        const current = await CertificateTemplateService.get_template_of_organizer(eventId);
        await CertificateTemplateService.save_template_of_organizer(applyDesign(current || initialTemplate, design), eventId);

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/certificates/making-template`);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[applyCertificateDesign]", err);
        return fail("Could not apply that design. Please try again.");
    }
}
