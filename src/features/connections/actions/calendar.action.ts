"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { assertMayUseConnection } from "@/src/features/connections/server/assertConnectionsAccess";
import {
  getConnectionById,
  listConnections,
} from "@/src/features/connections/server/connections.service";
import {
  deleteCalendarEvent,
  getCalendarIdForConnection,
  listCalendarsForConnection,
  setCalendarIdForConnection,
  upsertCalendarEvent,
} from "@/src/features/connections/server/calendarSync.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

export const listWritableCalendarsAction = safeAction({
  input: z.object({ connectionId: z.string().uuid() }),
  run: async ({ connectionId }) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const may = await assertMayUseConnection({
      userId: user.userId,
      connectionId,
      capability: "calendar",
    });
    if (!may.ok) return safeFail("FORBIDDEN", may.error);
    const limited = rateLimit(`cal:list:${user.userId}`, 20, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    const calendars = await listCalendarsForConnection(connectionId);
    const selected = await getCalendarIdForConnection(connectionId);
    return safeOk({ calendars, selected });
  },
});

export const setSelectedCalendarAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    calendarId: z.string().min(1).max(200),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const may = await assertMayUseConnection({
      userId: user.userId,
      connectionId: input.connectionId,
      capability: "calendar",
    });
    if (!may.ok) return safeFail("FORBIDDEN", may.error);
    await setCalendarIdForConnection(input.connectionId, input.calendarId);
    const conn = await getConnectionById(input.connectionId);
    if (conn) {
      revalidatePath(`/organizer/${conn.ownerId}/settings/connections`);
    }
    return safeOk({ saved: true });
  },
});

export const syncEntityToCalendarAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    entityType: z.enum([
      "interview",
      "mentor_slot",
      "judging_session",
      "hackathon_session",
      "agenda_item",
      "event",
    ]),
    entityId: z.string().min(1).max(200),
    summary: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    startIso: z.string().datetime(),
    endIso: z.string().datetime(),
    timeZone: z.string().min(1).max(80),
    withMeet: z.boolean().optional(),
    sendUpdates: z.enum(["none", "all"]).optional(),
    attendeeEmails: z.array(z.string().email()).max(20).optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const result = await upsertCalendarEvent({
      actorId: user.userId,
      connectionId: input.connectionId,
      entityType: input.entityType,
      entityId: input.entityId,
      withMeet: input.withMeet,
      sendUpdates: input.sendUpdates,
      payload: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        startIso: input.startIso,
        endIso: input.endIso,
        timeZone: input.timeZone,
        attendeeEmails: input.attendeeEmails,
      },
    });
    if (!result.ok) return safeFail("SYNC", result.error);
    return safeOk(result);
  },
});

export const removeEntityFromCalendarAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    entityType: z.enum([
      "interview",
      "mentor_slot",
      "judging_session",
      "hackathon_session",
      "agenda_item",
      "event",
    ]),
    entityId: z.string().min(1).max(200),
    sendUpdates: z.enum(["none", "all"]).optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const result = await deleteCalendarEvent({
      actorId: user.userId,
      connectionId: input.connectionId,
      entityType: input.entityType,
      entityId: input.entityId,
      sendUpdates: input.sendUpdates,
    });
    if (!result.ok) return safeFail("SYNC", result.error);
    return safeOk({ deleted: true });
  },
});

export const listMyCalendarConnectionsAction = safeAction({
  input: z.object({ ownerId: z.string().uuid().optional() }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const ownerId = input.ownerId || user.userId;
    if (ownerId !== user.userId) {
      const admin = await AuthService.requireAdmin("organizers");
      if (!admin?.isOwner) return safeFail("FORBIDDEN", "Forbidden.");
    }
    const list = await listConnections({ ownerType: "user", ownerId });
    const calendars = list.filter(
      (c) =>
        c.status === "active" &&
        c.capabilities.some((cap) => cap.capability === "calendar" && cap.enabled),
    );
    return safeOk({
      connections: calendars.map((c) => ({
        id: c.id,
        email: c.providerEmail,
      })),
    });
  },
});
