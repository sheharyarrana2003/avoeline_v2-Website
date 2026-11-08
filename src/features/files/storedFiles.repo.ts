import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { FileCategory, FileProvider, StoredFileRow } from "./types";

type DbRow = {
  id: string;
  provider: string;
  provider_file_id: string;
  connection_id: string | null;
  name: string;
  size: number | string;
  mime: string;
  checksum: string;
  category: string;
  entity_type: string;
  entity_id: string;
  organizer_id: string | null;
  event_id: string | null;
  needs_promote: boolean;
  promoted_at: string | null;
  uploaded_at: string;
  expires_at: string | null;
  extra: Record<string, unknown> | null;
};

export function mapStoredFileRow(row: DbRow): StoredFileRow {
  return {
    id: row.id,
    provider: row.provider as FileProvider,
    providerFileId: row.provider_file_id,
    connectionId: row.connection_id,
    name: row.name,
    size: Number(row.size) || 0,
    mime: row.mime,
    checksum: row.checksum || "",
    category: row.category as FileCategory,
    entityType: row.entity_type || "",
    entityId: row.entity_id || "",
    organizerId: row.organizer_id,
    eventId: row.event_id,
    needsPromote: !!row.needs_promote,
    promotedAt: row.promoted_at,
    uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at,
    extra: (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<string, unknown>,
  };
}

export async function insertStoredFile(input: {
  provider: FileProvider;
  providerFileId: string;
  connectionId?: string | null;
  name: string;
  size: number;
  mime: string;
  checksum: string;
  category: FileCategory;
  entityType: string;
  entityId: string;
  organizerId: string;
  eventId: string;
  needsPromote?: boolean;
  expiresAt?: string | null;
  extra?: Record<string, unknown>;
}): Promise<StoredFileRow> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.STORED_FILES)
    .insert({
      provider: input.provider,
      provider_file_id: input.providerFileId,
      connection_id: input.connectionId || null,
      name: input.name,
      size: input.size,
      mime: input.mime,
      checksum: input.checksum,
      category: input.category,
      entity_type: input.entityType,
      entity_id: input.entityId,
      organizer_id: input.organizerId,
      event_id: input.eventId,
      needs_promote: !!input.needsPromote,
      expires_at: input.expiresAt ?? null,
      extra: input.extra || {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save file metadata.");
  }
  return mapStoredFileRow(data as DbRow);
}

export async function getStoredFileById(id: string): Promise<StoredFileRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.STORED_FILES)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapStoredFileRow(data as DbRow);
}

export async function updateStoredFile(
  id: string,
  patch: Record<string, unknown>,
): Promise<StoredFileRow> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.STORED_FILES)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not update file metadata.");
  return mapStoredFileRow(data as DbRow);
}

export async function deleteStoredFileRow(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLES.STORED_FILES).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function countNeedsPromote(eventId?: string): Promise<number> {
  let q = supabaseAdmin
    .from(TABLES.STORED_FILES)
    .select("id", { count: "exact", head: true })
    .eq("needs_promote", true);
  if (eventId) q = q.eq("event_id", eventId);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function listNeedsPromote(limit = 20): Promise<StoredFileRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.STORED_FILES)
    .select("*")
    .eq("needs_promote", true)
    .eq("provider", "supabase")
    .order("uploaded_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map((r) => mapStoredFileRow(r as DbRow));
}

export { storageRefForFileId, fileIdFromStorageRef, publicFileUrl } from "./fileRefs.logic";
