import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { GoogleDriveClient, MIME, type DriveFileKind } from "../providers/google/drive";
import { assertMayUseConnection } from "./assertConnectionsAccess";
import { getAccessTokenForConnection, getConnectionById } from "./connections.service";
import { writeConnectionAudit } from "./audit.service";
import type {
  ConnectionOwnerType,
  LinkedFileEntityType,
  LinkedFilePublic,
  LinkedFileStatus,
} from "../types";

const AVOELINE_FOLDER = "Avoeline";

function mapRow(row: Record<string, unknown>, addedByName: string | null = null): LinkedFilePublic {
  return {
    id: String(row.id),
    title: String(row.title),
    mimeType: String(row.mime_type),
    webUrl: row.web_url ? String(row.web_url) : null,
    iconUrl: row.icon_url ? String(row.icon_url) : null,
    entityType: row.entity_type as LinkedFileEntityType,
    entityId: String(row.entity_id),
    status: (row.status as LinkedFileStatus) || "ok",
    addedAt: String(row.added_at || ""),
    addedBy: row.added_by ? String(row.added_by) : null,
    addedByName,
    providerModifiedAt: row.provider_modified_at ? String(row.provider_modified_at) : null,
    connectionId: String(row.connection_id),
    providerFileId: String(row.provider_file_id || ""),
  };
}

async function getDriveFolderId(connectionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("settings")
    .eq("connection_id", connectionId)
    .eq("capability", "drive.files")
    .maybeSingle();
  const settings = (data?.settings || {}) as { folder_id?: string };
  return settings.folder_id || null;
}

async function setDriveFolderId(connectionId: string, folderId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("settings")
    .eq("connection_id", connectionId)
    .eq("capability", "drive.files")
    .maybeSingle();
  const settings = {
    ...((data?.settings as Record<string, unknown>) || {}),
    folder_id: folderId,
  };
  await supabaseAdmin.from(TABLES.INTEGRATION_CAPABILITIES).upsert({
    connection_id: connectionId,
    capability: "drive.files",
    enabled: true,
    settings,
  });
}

export async function ensureAvoelineFolder(
  connectionId: string,
  accessToken: string,
): Promise<string> {
  const existing = await getDriveFolderId(connectionId);
  if (existing) {
    const status = await GoogleDriveClient.verifyAccess(accessToken, existing);
    if (status === "ok") return existing;
  }
  const folder = await GoogleDriveClient.createFolder(accessToken, AVOELINE_FOLDER);
  await setDriveFolderId(connectionId, folder.id);
  return folder.id;
}

async function upsertLinkedRow(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  connectionId: string;
  providerFileId: string;
  mimeType: string;
  title: string;
  webUrl: string | null;
  iconUrl: string | null;
  entityType: LinkedFileEntityType;
  entityId: string;
  addedBy: string;
  providerModifiedAt?: string | null;
}): Promise<LinkedFilePublic> {
  const patch = {
    title: opts.title,
    mime_type: opts.mimeType,
    web_url: opts.webUrl,
    icon_url: opts.iconUrl,
    status: "ok" as const,
    last_checked_at: new Date().toISOString(),
    provider_modified_at: opts.providerModifiedAt || null,
  };

  const { data: existing } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .select("*")
    .eq("connection_id", opts.connectionId)
    .eq("provider_file_id", opts.providerFileId)
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from(TABLES.LINKED_FILES)
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !updated) throw new Error(error?.message || "Could not update linked file.");
    return mapRow(updated as Record<string, unknown>);
  }

  const { data: inserted, error } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .insert({
      owner_type: opts.ownerType,
      owner_id: opts.ownerId,
      connection_id: opts.connectionId,
      provider_file_id: opts.providerFileId,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      added_by: opts.addedBy,
      ...patch,
    })
    .select("*")
    .single();
  if (error || !inserted) throw new Error(error?.message || "Could not link file.");
  return mapRow(inserted as Record<string, unknown>);
}

export async function linkPickedFile(opts: {
  actorId: string;
  connectionId: string;
  entityType: LinkedFileEntityType;
  entityId: string;
  providerFileId: string;
}): Promise<{ ok: true; file: LinkedFilePublic } | { ok: false; error: string }> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error };

  const conn = await getConnectionById(opts.connectionId);
  if (!conn || conn.status !== "active") {
    return { ok: false, error: "Connect Google Drive first." };
  }

  try {
    const token = await getAccessTokenForConnection(opts.connectionId);
    const meta = await GoogleDriveClient.getFileMetadata(token, opts.providerFileId);
    const file = await upsertLinkedRow({
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      connectionId: opts.connectionId,
      providerFileId: meta.id,
      mimeType: meta.mimeType,
      title: meta.name,
      webUrl: meta.webViewLink,
      iconUrl: meta.iconLink,
      entityType: opts.entityType,
      entityId: opts.entityId,
      addedBy: opts.actorId,
      providerModifiedAt: meta.modifiedTime,
    });
    await writeConnectionAudit({
      connectionId: opts.connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
      action: "drive_file_linked",
      details: { linkedFileId: file.id, entityType: opts.entityType, entityId: opts.entityId },
    });
    return { ok: true, file };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not link file." };
  }
}

export async function createAndLinkFile(opts: {
  actorId: string;
  connectionId: string;
  entityType: LinkedFileEntityType;
  entityId: string;
  kind: DriveFileKind;
  title: string;
}): Promise<{ ok: true; file: LinkedFilePublic } | { ok: false; error: string }> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error };

  const conn = await getConnectionById(opts.connectionId);
  if (!conn || conn.status !== "active") {
    return { ok: false, error: "Connect Google Drive first." };
  }

  try {
    const token = await getAccessTokenForConnection(opts.connectionId);
    let folderId = await ensureAvoelineFolder(opts.connectionId, token);
    if (opts.entityType === "event") {
      const { resolveEventRootFolderId } = await import("@/src/features/files/folders");
      folderId = await resolveEventRootFolderId({
        connectionId: opts.connectionId,
        accessToken: token,
        eventId: opts.entityId,
      });
    }
    const created = await GoogleDriveClient.createBlankFile(token, {
      kind: opts.kind,
      name: opts.title.slice(0, 200) || `Untitled ${opts.kind}`,
      parentId: folderId,
    });
    const file = await upsertLinkedRow({
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      connectionId: opts.connectionId,
      providerFileId: created.id,
      mimeType: created.mimeType || MIME[opts.kind],
      title: created.name,
      webUrl: created.webViewLink,
      iconUrl: created.iconLink,
      entityType: opts.entityType,
      entityId: opts.entityId,
      addedBy: opts.actorId,
      providerModifiedAt: created.modifiedTime,
    });
    await writeConnectionAudit({
      connectionId: opts.connectionId,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
      action: "drive_file_created",
      details: { linkedFileId: file.id, kind: opts.kind },
    });
    return { ok: true, file };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not create file." };
  }
}

export async function unlinkFile(opts: {
  actorId: string;
  linkedFileId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .select("*")
    .eq("id", opts.linkedFileId)
    .maybeSingle();
  if (!row) return { ok: false, error: "File link not found." };

  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: String(row.connection_id),
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error };

  const { error } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .delete()
    .eq("id", opts.linkedFileId);
  if (error) return { ok: false, error: error.message };

  await writeConnectionAudit({
    connectionId: String(row.connection_id),
    ownerType: row.owner_type as ConnectionOwnerType,
    ownerId: String(row.owner_id),
    actorId: opts.actorId,
    action: "drive_file_unlinked",
    details: { linkedFileId: opts.linkedFileId, providerFileId: row.provider_file_id },
  });
  return { ok: true };
}

export async function listLinkedFiles(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  entityType?: LinkedFileEntityType;
  entityId?: string;
  q?: string;
  mimeContains?: string;
  addedBy?: string;
  status?: LinkedFileStatus;
  limit?: number;
  cursor?: string;
}): Promise<{ files: LinkedFilePublic[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit || 40, 1), 100);
  let query = supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .select("*")
    .eq("owner_type", opts.ownerType)
    .eq("owner_id", opts.ownerId)
    .order("added_at", { ascending: false })
    .limit(limit + 1);

  if (opts.entityType) query = query.eq("entity_type", opts.entityType);
  if (opts.entityId) query = query.eq("entity_id", opts.entityId);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.mimeContains) query = query.ilike("mime_type", `%${opts.mimeContains}%`);
  if (opts.addedBy) query = query.eq("added_by", opts.addedBy);
  if (opts.q?.trim()) query = query.ilike("title", `%${opts.q.trim()}%`);
  if (opts.cursor) query = query.lt("added_at", opts.cursor);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  const adderIds = [
    ...new Set(
      slice
        .map((r) => r.added_by)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const nameById = new Map<string, string>();
  if (adderIds.length) {
    const { data: users } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id, full_name, email")
      .in("id", adderIds);
    for (const u of users || []) {
      nameById.set(String(u.id), String(u.full_name || u.email || "").trim() || "User");
    }
  }

  const files = slice.map((r) =>
    mapRow(
      r as Record<string, unknown>,
      r.added_by ? nameById.get(String(r.added_by)) || null : null,
    ),
  );
  const nextCursor = hasMore ? files[files.length - 1]?.addedAt || null : null;
  return { files, nextCursor };
}

export async function verifyLinkedFile(opts: {
  actorId: string;
  linkedFileId: string;
}): Promise<{ ok: true; status: LinkedFileStatus } | { ok: false; error: string }> {
  const { data: row } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .select("*")
    .eq("id", opts.linkedFileId)
    .maybeSingle();
  if (!row) return { ok: false, error: "File link not found." };

  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: String(row.connection_id),
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error };

  try {
    const token = await getAccessTokenForConnection(String(row.connection_id));
    const status = await GoogleDriveClient.verifyAccess(token, String(row.provider_file_id));
    const patch: Record<string, unknown> = {
      status,
      last_checked_at: new Date().toISOString(),
    };
    if (status === "ok") {
      const meta = await GoogleDriveClient.getFileMetadata(
        token,
        String(row.provider_file_id),
      ).catch(() => null);
      if (meta) {
        patch.title = meta.name;
        patch.web_url = meta.webViewLink;
        patch.icon_url = meta.iconLink;
        patch.mime_type = meta.mimeType;
        patch.provider_modified_at = meta.modifiedTime;
      }
    }
    await supabaseAdmin.from(TABLES.LINKED_FILES).update(patch).eq("id", opts.linkedFileId);
    return { ok: true, status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Verify failed." };
  }
}

/** Cron: verify a batch of stale linked files. */
export async function verifyStaleLinkedFiles(limit = 40): Promise<{ checked: number }> {
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from(TABLES.LINKED_FILES)
    .select("id, connection_id, provider_file_id")
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  let checked = 0;
  for (const row of rows || []) {
    try {
      const token = await getAccessTokenForConnection(String(row.connection_id));
      const status = await GoogleDriveClient.verifyAccess(token, String(row.provider_file_id));
      await supabaseAdmin
        .from(TABLES.LINKED_FILES)
        .update({ status, last_checked_at: new Date().toISOString() })
        .eq("id", row.id);
      checked += 1;
    } catch {
      await supabaseAdmin
        .from(TABLES.LINKED_FILES)
        .update({ status: "no_access", last_checked_at: new Date().toISOString() })
        .eq("id", row.id);
      checked += 1;
    }
  }
  return { checked };
}

export async function listDriveConnectionsForUser(
  userId: string,
): Promise<Array<{ id: string; email: string; ownerType: ConnectionOwnerType; ownerId: string }>> {
  const { listConnections } = await import("./connections.service");
  const personal = await listConnections({ ownerType: "user", ownerId: userId });
  const out = personal
    .filter(
      (c) =>
        c.status === "active" &&
        c.capabilities.some((cap) => cap.capability === "drive.files" && cap.enabled),
    )
    .map((c) => ({
      id: c.id,
      email: c.providerEmail,
      ownerType: c.ownerType,
      ownerId: c.ownerId,
    }));

  const { data: grants } = await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .select("connection_id, capabilities")
    .eq("user_id", userId)
    .is("revoked_at", null);
  const grantConnIds = [
    ...new Set(
      (grants || [])
        .filter((g) => ((g.capabilities as string[]) || []).includes("drive.files"))
        .map((g) => String(g.connection_id)),
    ),
  ].filter((id) => !out.some((c) => c.id === id));

  if (grantConnIds.length) {
    const { data: rows } = await supabaseAdmin
      .from(TABLES.INTEGRATION_CONNECTIONS)
      .select("id, provider_email, owner_type, owner_id, status")
      .in("id", grantConnIds)
      .eq("status", "active");
    for (const r of rows || []) {
      out.push({
        id: String(r.id),
        email: String(r.provider_email),
        ownerType: r.owner_type as ConnectionOwnerType,
        ownerId: String(r.owner_id),
      });
    }
  }

  return out;
}
