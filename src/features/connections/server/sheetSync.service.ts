import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { GoogleDriveClient, MIME } from "../providers/google/drive";
import { assertMayUseConnection } from "./assertConnectionsAccess";
import { getAccessTokenForConnection, getConnectionById } from "./connections.service";
import { ensureAvoelineFolder } from "./linkedFiles.service";
import { writeConnectionAudit } from "./audit.service";
import {
  pauseMessage,
  pauseReasonFromHttp,
  sanitizeSheetMatrix,
  sheetRowsFingerprint,
  shouldRewriteSheet,
} from "../lib/sheetSanitize";
import { classifySheetWriteFailure, quotaDeferMessage } from "../lib/sheetWrite.logic";
import {
  mouDraftBody,
  runOfShowBody,
  sponsorTrackerHeaders,
  templateTitle,
  type TemplateKind,
} from "../lib/templates.logic";
import {
  attendeeColumns,
  checkInColumns,
  checkInRows,
  hackathonTeamSummaryColumns,
  type AttendeeRow,
} from "@/src/features/exports/eventSheets";
import { listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import type { ConnectionOwnerType } from "../types";

export type SheetSyncKind = "attendees" | "checkin" | "hackathon_teams";

async function buildAttendeeMatrix(eventId: string): Promise<unknown[][]> {
  const regs = await RegService.getRegsOfEvent(eventId);
  const usersById = regs.length
    ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
    : new Map();
  const rows: AttendeeRow[] = regs.map((reg) => {
    const user = usersById.get(String(reg.userId));
    return {
      reg,
      name: user?.profile?.fullName || reg.attendee?.name || "",
      email: user?.email || reg.attendee?.email || "",
    };
  });
  const { listAllFields, fieldsToCustomForm } =
    await import("@/src/features/registration/forms/formFields.service");
  const allFields = await listAllFields(eventId).catch(() => []);
  const questions = fieldsToCustomForm(
    allFields
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .filter((f) => !["name", "email", "phone"].includes(f.key)),
  ) as Parameters<typeof attendeeColumns>[0];
  const cols = attendeeColumns(questions);
  return [cols.map((c) => c.header), ...rows.map((r) => cols.map((c) => c.value(r)))];
}

async function buildCheckinMatrix(eventId: string): Promise<unknown[][]> {
  const regs = await RegService.getRegsOfEvent(eventId);
  const usersById = regs.length
    ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
    : new Map();
  const rows: AttendeeRow[] = regs.map((reg) => {
    const user = usersById.get(String(reg.userId));
    return {
      reg,
      name: user?.profile?.fullName || reg.attendee?.name || "",
      email: user?.email || reg.attendee?.email || "",
    };
  });
  const data = checkInRows(rows);
  return [
    checkInColumns.map((c) => c.header),
    ...data.map((r) => checkInColumns.map((c) => c.value(r))),
  ];
}

async function buildTeamsMatrix(eventId: string): Promise<unknown[][]> {
  const [teams, tracks] = await Promise.all([listTeamsOfEvent(eventId), listTracks(eventId)]);
  const summary = teams.map((t) => ({
    teamName: t.name,
    trackName: tracks.find((tr) => tr.id === t.trackId)?.name ?? "",
    leadName: t.members.find((m) => m.isOwner)?.name ?? t.members[0]?.name ?? "",
    memberCount: t.members.length,
    paymentStatus: t.feeStatus || "",
    accessCode: t.accessCode || "",
  }));
  return [
    hackathonTeamSummaryColumns.map((c) => c.header),
    ...summary.map((r) => hackathonTeamSummaryColumns.map((c) => c.value(r))),
  ];
}

async function buildMatrix(eventId: string, kind: SheetSyncKind): Promise<unknown[][]> {
  if (kind === "checkin") return buildCheckinMatrix(eventId);
  if (kind === "hackathon_teams") return buildTeamsMatrix(eventId);
  return buildAttendeeMatrix(eventId);
}

async function linkSheetFile(opts: {
  connectionId: string;
  ownerType: ConnectionOwnerType;
  ownerId: string;
  actorId: string;
  eventId: string;
  meta: {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string | null;
    iconLink: string | null;
  };
}): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .upsert(
      {
        owner_type: opts.ownerType,
        owner_id: opts.ownerId,
        connection_id: opts.connectionId,
        provider_file_id: opts.meta.id,
        mime_type: opts.meta.mimeType || MIME.sheet,
        title: opts.meta.name,
        web_url: opts.meta.webViewLink,
        icon_url: opts.meta.iconLink,
        entity_type: "event",
        entity_id: opts.eventId,
        added_by: opts.actorId,
        status: "ok",
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "connection_id,provider_file_id,entity_type,entity_id" },
    )
    .select("id")
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

type SheetSyncRow = {
  id?: string;
  connection_id: string;
  event_id: string;
  kind: string;
  spreadsheet_id?: string | null;
  row_fingerprint?: string | null;
  created_by?: string | null;
  keep_in_sync?: boolean | null;
};

async function applySheetWriteFailure(opts: {
  connectionId: string;
  eventId: string;
  kind: SheetSyncKind;
  syncRowId?: string | null;
  httpStatus?: number;
}): Promise<{ action: ReturnType<typeof classifySheetWriteFailure>; message: string }> {
  const action = classifySheetWriteFailure(opts.httpStatus);
  const message =
    action === "defer" ? quotaDeferMessage() : pauseMessage(pauseReasonFromHttp(opts.httpStatus));

  if (action === "defer") {
    const patch = {
      last_error: message,
      last_synced_at: new Date().toISOString(),
    };
    if (opts.syncRowId) {
      await supabaseAdmin.from(TABLES.SHEET_SYNCS).update(patch).eq("id", opts.syncRowId);
    } else {
      await supabaseAdmin
        .from(TABLES.SHEET_SYNCS)
        .update(patch)
        .eq("connection_id", opts.connectionId)
        .eq("event_id", opts.eventId)
        .eq("kind", opts.kind);
    }
    return { action, message };
  }

  const patch = {
    status: "paused" as const,
    keep_in_sync: false,
    last_error: message,
  };
  if (opts.syncRowId) {
    await supabaseAdmin.from(TABLES.SHEET_SYNCS).update(patch).eq("id", opts.syncRowId);
  } else {
    await supabaseAdmin
      .from(TABLES.SHEET_SYNCS)
      .update(patch)
      .eq("connection_id", opts.connectionId)
      .eq("event_id", opts.eventId)
      .eq("kind", opts.kind);
  }
  return { action, message };
}

/**
 * Cron/hook path: refresh an existing keep-in-sync row without user grant checks.
 * Does not create a new spreadsheet if missing metadata → pauses instead.
 */
export async function runActiveSheetSync(
  row: SheetSyncRow,
): Promise<{ ok: true; deferred?: boolean } | { ok: false; error: string; paused?: boolean }> {
  const connectionId = String(row.connection_id);
  const eventId = String(row.event_id);
  const kind = row.kind as SheetSyncKind;
  const syncRowId = row.id ? String(row.id) : null;

  const conn = await getConnectionById(connectionId);
  if (!conn || conn.status !== "active") {
    await applySheetWriteFailure({
      connectionId,
      eventId,
      kind,
      syncRowId,
      httpStatus: 401,
    });
    return { ok: false, error: pauseMessage("no_access"), paused: true };
  }

  try {
    const token = await getAccessTokenForConnection(connectionId);
    const spreadsheetId = row.spreadsheet_id ? String(row.spreadsheet_id) : "";
    if (!spreadsheetId) {
      await applySheetWriteFailure({
        connectionId,
        eventId,
        kind,
        syncRowId,
        httpStatus: 404,
      });
      return { ok: false, error: pauseMessage("missing"), paused: true };
    }

    const meta = await GoogleDriveClient.getFileMetadata(token, spreadsheetId).catch(() => null);
    if (!meta) {
      await applySheetWriteFailure({
        connectionId,
        eventId,
        kind,
        syncRowId,
        httpStatus: 404,
      });
      return { ok: false, error: pauseMessage("missing"), paused: true };
    }

    const matrix = sanitizeSheetMatrix(await buildMatrix(eventId, kind));
    const fingerprint = sheetRowsFingerprint(matrix);
    const rewrite = shouldRewriteSheet({
      previousFingerprint: row.row_fingerprint,
      nextFingerprint: fingerprint,
    });

    if (rewrite) {
      await GoogleDriveClient.clearAndWriteSheetValues(token, spreadsheetId, matrix);
    }

    await linkSheetFile({
      connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: String(row.created_by || conn.ownerId),
      eventId,
      meta,
    });

    const successPatch = {
      status: "active" as const,
      keep_in_sync: true,
      last_error: null as string | null,
      last_synced_at: new Date().toISOString(),
      row_fingerprint: fingerprint,
    };
    if (syncRowId) {
      await supabaseAdmin.from(TABLES.SHEET_SYNCS).update(successPatch).eq("id", syncRowId);
    } else {
      await supabaseAdmin
        .from(TABLES.SHEET_SYNCS)
        .update(successPatch)
        .eq("connection_id", connectionId)
        .eq("event_id", eventId)
        .eq("kind", kind);
    }

    return { ok: true };
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number })?.httpStatus;
    const { action, message } = await applySheetWriteFailure({
      connectionId,
      eventId,
      kind,
      syncRowId,
      httpStatus,
    });
    if (action === "defer") return { ok: true, deferred: true };
    return {
      ok: false,
      error: err instanceof Error ? err.message : message,
      paused: action === "pause" || action === "error",
    };
  }
}

/** Refresh keep-in-sync sheets after roster mutations. */
export async function refreshActiveSheetsForEvent(
  eventId: string,
  kinds?: SheetSyncKind[],
): Promise<void> {
  if (!eventId) return;
  let query = supabaseAdmin
    .from(TABLES.SHEET_SYNCS)
    .select("*")
    .eq("event_id", eventId)
    .eq("keep_in_sync", true)
    .eq("status", "active");
  if (kinds?.length) query = query.in("kind", kinds);
  const { data: rows } = await query;
  for (const row of rows || []) {
    try {
      await runActiveSheetSync(row as SheetSyncRow);
    } catch (err) {
      console.warn("[sheetSync] refresh failed", eventId, row.kind, err);
    }
  }
}

/** Non-blocking schedule for mutation hooks (never throws into UX). */
export function scheduleSheetRefresh(eventId: string, kinds?: SheetSyncKind[]): void {
  void refreshActiveSheetsForEvent(eventId, kinds).catch((err) => {
    console.warn("[sheetSync] scheduleSheetRefresh", eventId, err);
  });
}

export async function exportOrSyncSheet(opts: {
  actorId: string;
  connectionId: string;
  eventId: string;
  kind: SheetSyncKind;
  keepInSync: boolean;
}): Promise<
  | { ok: true; spreadsheetId: string; webUrl: string | null; status: string }
  | { ok: false; error: string }
> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "sheets.sync",
  });
  if (!may.ok) {
    const mayDrive = await assertMayUseConnection({
      userId: opts.actorId,
      connectionId: opts.connectionId,
      capability: "drive.files",
    });
    if (!mayDrive.ok) return { ok: false, error: may.error };
  }

  const conn = await getConnectionById(opts.connectionId);
  if (!conn || conn.status !== "active") {
    return { ok: false, error: "Connect Google Drive first." };
  }

  try {
    const token = await getAccessTokenForConnection(opts.connectionId);
    const matrix = sanitizeSheetMatrix(await buildMatrix(opts.eventId, opts.kind));
    const fingerprint = sheetRowsFingerprint(matrix);

    const { data: existing } = await supabaseAdmin
      .from(TABLES.SHEET_SYNCS)
      .select("*")
      .eq("connection_id", opts.connectionId)
      .eq("event_id", opts.eventId)
      .eq("kind", opts.kind)
      .maybeSingle();

    let spreadsheetId = existing?.spreadsheet_id as string | undefined;
    let meta = spreadsheetId
      ? await GoogleDriveClient.getFileMetadata(token, spreadsheetId).catch(() => null)
      : null;

    if (spreadsheetId && !meta) {
      await supabaseAdmin
        .from(TABLES.SHEET_SYNCS)
        .update({
          status: "paused",
          last_error: pauseMessage("missing"),
          keep_in_sync: false,
        })
        .eq("id", existing!.id);
      spreadsheetId = undefined;
    }

    if (!spreadsheetId) {
      const folderId = await ensureAvoelineFolder(opts.connectionId, token);
      const event = await EventService.getEventByID(opts.eventId);
      const created = await GoogleDriveClient.createBlankFile(token, {
        kind: "sheet",
        name: `${opts.kind} — ${(event?.title || opts.eventId).slice(0, 80)}`,
        parentId: folderId,
      });
      spreadsheetId = created.id;
      meta = created;
    }

    const rewrite =
      !existing ||
      shouldRewriteSheet({
        previousFingerprint: existing.row_fingerprint,
        nextFingerprint: fingerprint,
      });

    if (rewrite) {
      await GoogleDriveClient.clearAndWriteSheetValues(token, spreadsheetId, matrix);
    }

    const linkedFileId = await linkSheetFile({
      connectionId: opts.connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
      eventId: opts.eventId,
      meta: meta || {
        id: spreadsheetId,
        name: opts.kind,
        mimeType: MIME.sheet,
        webViewLink: null,
        iconLink: null,
      },
    });

    const row = {
      connection_id: opts.connectionId,
      event_id: opts.eventId,
      kind: opts.kind,
      spreadsheet_id: spreadsheetId,
      sheet_title: "Sheet1",
      linked_file_id: linkedFileId,
      keep_in_sync: opts.keepInSync,
      status: "active" as const,
      last_error: null as string | null,
      last_synced_at: new Date().toISOString(),
      row_fingerprint: fingerprint,
      created_by: opts.actorId,
    };

    await supabaseAdmin.from(TABLES.SHEET_SYNCS).upsert(row, {
      onConflict: "connection_id,event_id,kind",
    });

    await writeConnectionAudit({
      connectionId: opts.connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
      action: opts.keepInSync ? "sheet_sync_enabled" : "sheet_exported",
      details: { eventId: opts.eventId, kind: opts.kind, spreadsheetId },
    });

    const webUrl =
      meta?.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return { ok: true, spreadsheetId, webUrl, status: "active" };
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number })?.httpStatus;
    const { action, message } = await applySheetWriteFailure({
      connectionId: opts.connectionId,
      eventId: opts.eventId,
      kind: opts.kind,
      httpStatus,
    });
    if (action === "defer") {
      return { ok: false, error: message };
    }
    return { ok: false, error: err instanceof Error ? err.message : message };
  }
}

export async function setKeepInSync(opts: {
  actorId: string;
  connectionId: string;
  eventId: string;
  kind: SheetSyncKind;
  keepInSync: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "sheets.sync",
  });
  if (!may.ok) {
    const mayDrive = await assertMayUseConnection({
      userId: opts.actorId,
      connectionId: opts.connectionId,
      capability: "drive.files",
    });
    if (!mayDrive.ok) return { ok: false, error: may.error };
  }
  const { error } = await supabaseAdmin
    .from(TABLES.SHEET_SYNCS)
    .update({
      keep_in_sync: opts.keepInSync,
      status: "active",
      ...(opts.keepInSync ? { last_error: null } : {}),
    })
    .eq("event_id", opts.eventId)
    .eq("kind", opts.kind);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getSheetSyncForEvent(eventId: string): Promise<
  Array<{
    id: string;
    kind: string;
    spreadsheetId: string;
    keepInSync: boolean;
    status: string;
    lastError: string | null;
    lastSyncedAt: string | null;
    webUrl: string;
  }>
> {
  const { data } = await supabaseAdmin.from(TABLES.SHEET_SYNCS).select("*").eq("event_id", eventId);
  return (data || []).map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    spreadsheetId: String(r.spreadsheet_id),
    keepInSync: Boolean(r.keep_in_sync),
    status: String(r.status),
    lastError: r.last_error ? String(r.last_error) : null,
    lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
    webUrl: `https://docs.google.com/spreadsheets/d/${r.spreadsheet_id}/edit`,
  }));
}

export type OwnerSheetSyncRow = {
  id: string;
  connectionId: string;
  eventId: string;
  kind: string;
  spreadsheetId: string;
  keepInSync: boolean;
  status: string;
  lastError: string | null;
  lastSyncedAt: string | null;
  webUrl: string;
};

/** Sheet syncs for all connections owned by this user. */
export async function listSheetSyncsForOwner(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  limit?: number;
}): Promise<OwnerSheetSyncRow[]> {
  const { data: conns } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("owner_type", opts.ownerType)
    .eq("owner_id", opts.ownerId)
    .neq("status", "revoked");
  const ids = (conns || []).map((c) => String(c.id));
  if (!ids.length) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.SHEET_SYNCS)
    .select("*")
    .in("connection_id", ids)
    .order("last_synced_at", { ascending: false })
    .limit(opts.limit ?? 50);
  return (data || []).map((r) => ({
    id: String(r.id),
    connectionId: String(r.connection_id),
    eventId: String(r.event_id),
    kind: String(r.kind),
    spreadsheetId: String(r.spreadsheet_id),
    keepInSync: Boolean(r.keep_in_sync),
    status: String(r.status),
    lastError: r.last_error ? String(r.last_error) : null,
    lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
    webUrl: `https://docs.google.com/spreadsheets/d/${r.spreadsheet_id}/edit`,
  }));
}

/** Cron: refresh keep_in_sync sheets via connection token (no user grant check). */
export async function processSheetSyncs(limit = 20): Promise<{ synced: number; paused: number }> {
  const { data: rows } = await supabaseAdmin
    .from(TABLES.SHEET_SYNCS)
    .select("*")
    .eq("keep_in_sync", true)
    .eq("status", "active")
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  let synced = 0;
  let paused = 0;
  for (const row of rows || []) {
    const result = await runActiveSheetSync(row as SheetSyncRow);
    if (result.ok) synced += 1;
    else if (result.paused) paused += 1;
  }
  return { synced, paused };
}

export async function createEventTemplateDoc(opts: {
  actorId: string;
  connectionId: string;
  eventId: string;
  kind: TemplateKind;
}): Promise<{ ok: true; webUrl: string | null; fileId: string } | { ok: false; error: string }> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error };

  const conn = await getConnectionById(opts.connectionId);
  if (!conn || conn.status !== "active") return { ok: false, error: "Connect Google Drive first." };

  const event = await EventService.getEventByID(opts.eventId);
  if (!event) return { ok: false, error: "Event not found." };
  const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
  const title = templateTitle(opts.kind, event.title || "Event");

  try {
    const token = await getAccessTokenForConnection(opts.connectionId);
    const folderId = await ensureAvoelineFolder(opts.connectionId, token);

    if (opts.kind === "sponsor_tracker") {
      const sheet = await GoogleDriveClient.createBlankFile(token, {
        kind: "sheet",
        name: title,
        parentId: folderId,
      });
      const orgs = await getEventOrganizations(opts.eventId);
      const matrix = sanitizeSheetMatrix([
        sponsorTrackerHeaders(),
        ...orgs.map((o) => [
          o.name || "",
          o.type === "sponsor" ? o.tier || "" : o.partnershipKind || "",
          o.contributionKind || "",
          o.type === "sponsor" ? Number(o.contractValue ?? 0) : "",
          o.type || "",
          o.contactEmail || o.invitedEmail || "",
          o.collaborationTerms || "",
        ]),
      ]);
      await GoogleDriveClient.clearAndWriteSheetValues(token, sheet.id, matrix);
      await linkSheetFile({
        connectionId: opts.connectionId,
        ownerType: conn.ownerType,
        ownerId: conn.ownerId,
        actorId: opts.actorId,
        eventId: opts.eventId,
        meta: sheet,
      });
      return { ok: true, webUrl: sheet.webViewLink, fileId: sheet.id };
    }

    const doc = await GoogleDriveClient.createBlankFile(token, {
      kind: "doc",
      name: title,
      parentId: folderId,
    });
    const venue = [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
    let body: string;
    if (opts.kind === "mou_draft") {
      body = mouDraftBody({
        eventTitle: event.title || "",
        organizerName: organizer?.organization?.name || "",
      });
    } else {
      const { AgendaService } = await import("@/src/features/agendas/agenda.service");
      const sessions = await AgendaService.getSessionsByEventId(opts.eventId).catch(() => []);
      const agendaLines = sessions
        .slice()
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
        .map((s) => ({
          date: String(s.date || ""),
          startTime: String(s.startTime || ""),
          endTime: String(s.endTime || ""),
          title: String(s.title || "Session"),
          location: String(s.location || ""),
        }));
      body = runOfShowBody({
        eventTitle: event.title || "",
        startDate: String(event.schedule?.startDate || ""),
        endDate: String(event.schedule?.endDate || ""),
        venue,
        agendaLines,
      });
    }
    await GoogleDriveClient.writeDocPlainText(token, doc.id, body);
    await linkSheetFile({
      connectionId: opts.connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
      eventId: opts.eventId,
      meta: { ...doc, mimeType: MIME.doc },
    });
    return { ok: true, webUrl: doc.webViewLink, fileId: doc.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not create template." };
  }
}
