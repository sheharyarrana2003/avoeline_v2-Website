"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { EventService } from "@/src/services/event.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const schema = z.object({
  eventId: z.string().uuid(),
  showSponsors: z.boolean(),
  showCollaborators: z.boolean(),
  showPartners: z.boolean(),
});

export const updatePublicShowToggles = safeAction({
  input: schema,
  auth: async () => ({ label: "updatePublicShowToggles" }),
  run: async (input) => {
    const event = await assertOwnedEvent(input.eventId);
    if (!event) return safeFail("FORBIDDEN", "You cannot edit this event.");

    try {
      await EventService.update_event(input.eventId, {
        showSponsors: input.showSponsors,
        showCollaborators: input.showCollaborators,
        showPartners: input.showPartners,
      });
    } catch (err) {
      console.error("[updatePublicShowToggles]", err);
      return safeFail("WRITE", "Could not save public display settings.");
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/sponsors`);
    revalidatePath(`/events/${input.eventId}`);
    revalidatePath(`/e/${input.eventId}`);
    return safeOk({
      showSponsors: input.showSponsors,
      showCollaborators: input.showCollaborators,
      showPartners: input.showPartners,
    });
  },
});
