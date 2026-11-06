"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { assertEventActor } from "@/src/features/events/ownership";
import {
  createEventTemplateDoc,
  exportOrSyncSheet,
  getSheetSyncForEvent,
  setKeepInSync,
} from "@/src/features/connections/server/sheetSync.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

export const listSheetSyncsAction = safeAction({
  input: z.object({ eventId: z.string().uuid() }),
  run: async ({ eventId }) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot manage sheets for that event.");
    const syncs = await getSheetSyncForEvent(eventId);
    return safeOk({ syncs });
  },
});

export const exportToGoogleSheetAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    connectionId: z.string().uuid(),
    kind: z.enum(["attendees", "checkin", "hackathon_teams"]),
    keepInSync: z.boolean().optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot export that event.");
    const limited = rateLimit(`sheet:export:${user.userId}`, 10, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    const r = await exportOrSyncSheet({
      actorId: user.userId,
      connectionId: input.connectionId,
      eventId: input.eventId,
      kind: input.kind,
      keepInSync: Boolean(input.keepInSync),
    });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/exports`);
    return safeOk(r);
  },
});

export const setSheetKeepInSyncAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    connectionId: z.string().uuid(),
    kind: z.enum(["attendees", "checkin", "hackathon_teams"]),
    keepInSync: z.boolean(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot manage that event.");
    const r = await setKeepInSync({
      actorId: user.userId,
      connectionId: input.connectionId,
      eventId: input.eventId,
      kind: input.kind,
      keepInSync: input.keepInSync,
    });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    return safeOk({ saved: true });
  },
});

export const createTemplateDocAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    connectionId: z.string().uuid(),
    kind: z.enum(["run_of_show", "sponsor_tracker", "mou_draft"]),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot create templates for that event.");
    const limited = rateLimit(`sheet:tpl:${user.userId}`, 10, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    const r = await createEventTemplateDoc({
      actorId: user.userId,
      connectionId: input.connectionId,
      eventId: input.eventId,
      kind: input.kind,
    });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/files`);
    return safeOk(r);
  },
});
