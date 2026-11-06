import "server-only";

import { createHash } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { GoogleCalendarClient } from "../providers/google/calendar";
import type { CalendarEventPayload } from "../providers/google/calendar";
import { assertMayUseConnection } from "./assertConnectionsAccess";
import { getAccessTokenForConnection, getConnectionById } from "./connections.service";
import { writeConnectionAudit } from "./audit.service";
import { stableMeetRequestId } from "../lib/calendarFallbacks";
import {
  idempotentRequestId,
  nextLinkStatusAfterUpsert,
  shouldCreateVsUpdate,
} from "../lib/calendarSync.logic";

import type { CalendarEntityType, ConnectionOwnerType } from "../types";
export type { CalendarEntityType };

export type UpsertCalendarResult =
  | {
      ok: true;
      linkId: string;
      googleEventId: string;
      meetUrl: string | null;
      status: string;
    }
  | { ok: false; error: string };

function requestIdFor(connectionId: string, entityType: string, entityId: string): string {
  return createHash("sha256")
    .update(stableMeetRequestId(connectionId, entityType, entityId))
    .digest("hex")
    .slice(0, 48);
}

export async function getCalendarIdForConnection(connectionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("settings")
    .eq("connection_id", connectionId)
    .eq("capability", "calendar")
    .maybeSingle();
  const settings = (data?.settings || {}) as { calendar_id?: string };
  return settings.calendar_id || "primary";
}

/** List writable calendars for a connection (actions must not import Google providers). */
export async function listCalendarsForConnection(connectionId: string) {
  const token = await getAccessTokenForConnection(connectionId);
  return GoogleCalendarClient.listCalendars(token);
}

export async function setCalendarIdForConnection(
  connectionId: string,
  calendarId: string,
): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("settings")
    .eq("connection_id", connectionId)
    .eq("capability", "calendar")
    .maybeSingle();
  const settings = {
    ...((data?.settings as Record<string, unknown>) || {}),
    calendar_id: calendarId,
  };
  await supabaseAdmin.from(TABLES.INTEGRATION_CAPABILITIES).upsert({
    connection_id: connectionId,
    capability: "calendar",
    enabled: true,
    settings,
  });
}

export async function upsertCalendarEvent(opts: {
  actorId: string;
  connectionId: string;
  entityType: CalendarEntityType;
  entityId: string;
  payload: CalendarEventPayload;
  withMeet?: boolean;
  sendUpdates?: "none" | "all";
}): Promise<UpsertCalendarResult> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "calendar",
  });
  if (!may.ok) return { ok: false, error: may.error };

  const conn = await getConnectionById(opts.connectionId);
  if (!conn || conn.status !== "active") {
    return { ok: false, error: "Connect Google Calendar first." };
  }

  const calendarId = (await getCalendarIdForConnection(opts.connectionId)) || "primary";
  const sendUpdates = opts.sendUpdates || "none";
  const withMeet = Boolean(opts.withMeet);

  const { data: existing } = await supabaseAdmin
    .from(TABLES.CALENDAR_LINKS)
    .select("*")
    .eq("connection_id", opts.connectionId)
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .maybeSingle();

  const computedRid = requestIdFor(opts.connectionId, opts.entityType, opts.entityId);
  const requestId = idempotentRequestId(existing?.request_id, computedRid);
  const mode = shouldCreateVsUpdate(existing?.google_event_id);

  let linkId = existing?.id;
  if (!linkId) {
    const { data: inserted, error } = await supabaseAdmin
      .from(TABLES.CALENDAR_LINKS)
      .insert({
        connection_id: opts.connectionId,
        entity_type: opts.entityType,
        entity_id: opts.entityId,
        google_calendar_id: calendarId,
        request_id: requestId,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !inserted) return { ok: false, error: error?.message || "Could not create link." };
    linkId = inserted.id;
  }

  try {
    const accessToken = await getAccessTokenForConnection(opts.connectionId);
    const result =
      mode === "update" && existing?.google_event_id
        ? await GoogleCalendarClient.updateEvent(accessToken, {
            calendarId,
            eventId: existing.google_event_id,
            payload: opts.payload,
            withMeet,
            requestId,
            sendUpdates,
            existingMeet: Boolean(existing.meet_url),
          })
        : await GoogleCalendarClient.createEvent(accessToken, {
            calendarId,
            payload: opts.payload,
            withMeet,
            requestId,
            sendUpdates,
          });

    let meetUrl = result.meetUrl;
    if (withMeet && result.hangoutPending) {
      meetUrl =
        (await GoogleCalendarClient.pollMeetUrl(accessToken, calendarId, result.eventId)) ||
        meetUrl;
    }

    const status = nextLinkStatusAfterUpsert({
      hadGoogleEventId: Boolean(existing?.google_event_id),
      meetPending: withMeet && !meetUrl && result.hangoutPending,
    });

    await supabaseAdmin
      .from(TABLES.CALENDAR_LINKS)
      .update({
        google_calendar_id: calendarId,
        google_event_id: result.eventId,
        meet_url: meetUrl,
        request_id: requestId,
        etag: result.etag,
        status,
        last_error: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", linkId);

    await writeConnectionAudit({
      connectionId: opts.connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
      action: mode === "create" ? "calendar_create" : "calendar_update",
      details: { entityType: opts.entityType, withMeet },
    });

    return {
      ok: true,
      linkId,
      googleEventId: result.eventId,
      meetUrl,
      status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar sync failed";
    await supabaseAdmin
      .from(TABLES.CALENDAR_LINKS)
      .update({
        status: "error",
        last_error: message.slice(0, 500),
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", linkId);
    return { ok: false, error: message };
  }
}

export async function deleteCalendarEvent(opts: {
  actorId: string;
  connectionId: string;
  entityType: CalendarEntityType;
  entityId: string;
  sendUpdates?: "none" | "all";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "calendar",
  });
  if (!may.ok) return { ok: false, error: may.error };

  const { data: existing } = await supabaseAdmin
    .from(TABLES.CALENDAR_LINKS)
    .select("*")
    .eq("connection_id", opts.connectionId)
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .maybeSingle();
  if (!existing?.google_event_id) {
    if (existing) {
      await supabaseAdmin
        .from(TABLES.CALENDAR_LINKS)
        .update({ status: "deleted", last_synced_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return { ok: true };
  }

  try {
    const accessToken = await getAccessTokenForConnection(opts.connectionId);
    await GoogleCalendarClient.deleteEvent(accessToken, {
      calendarId: existing.google_calendar_id,
      eventId: existing.google_event_id,
      sendUpdates: opts.sendUpdates || "none",
    });
    await supabaseAdmin
      .from(TABLES.CALENDAR_LINKS)
      .update({
        status: "deleted",
        meet_url: null,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", existing.id);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return { ok: false, error: message };
  }
}

export async function getCalendarLink(opts: {
  entityType: CalendarEntityType;
  entityId: string;
  connectionId?: string;
}) {
  let q = supabaseAdmin
    .from(TABLES.CALENDAR_LINKS)
    .select("*")
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .neq("status", "deleted")
    .order("last_synced_at", { ascending: false })
    .limit(1);
  if (opts.connectionId) q = q.eq("connection_id", opts.connectionId);
  const { data } = await q.maybeSingle();
  return data;
}

export type OwnerCalendarLinkRow = {
  id: string;
  connectionId: string;
  entityType: string;
  entityId: string;
  googleCalendarId: string;
  googleEventId: string | null;
  meetUrl: string | null;
  status: string;
  lastError: string | null;
  lastSyncedAt: string | null;
  htmlLink: string | null;
};

/** Calendar links for all connections owned by this user/org. */
export async function listCalendarLinksForOwner(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  limit?: number;
}): Promise<OwnerCalendarLinkRow[]> {
  const { data: conns } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("owner_type", opts.ownerType)
    .eq("owner_id", opts.ownerId)
    .neq("status", "revoked");
  const ids = (conns || []).map((c) => String(c.id));
  if (!ids.length) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.CALENDAR_LINKS)
    .select("*")
    .in("connection_id", ids)
    .neq("status", "deleted")
    .order("last_synced_at", { ascending: false })
    .limit(opts.limit ?? 50);
  return (data || []).map((r) => {
    const calId = encodeURIComponent(String(r.google_calendar_id || "primary"));
    return {
      id: String(r.id),
      connectionId: String(r.connection_id),
      entityType: String(r.entity_type),
      entityId: String(r.entity_id),
      googleCalendarId: String(r.google_calendar_id),
      googleEventId: r.google_event_id ? String(r.google_event_id) : null,
      meetUrl: r.meet_url ? String(r.meet_url) : null,
      status: String(r.status),
      lastError: r.last_error ? String(r.last_error) : null,
      lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
      htmlLink: r.meet_url
        ? String(r.meet_url)
        : `https://calendar.google.com/calendar/u/0/r?cid=${calId}`,
    };
  });
}
