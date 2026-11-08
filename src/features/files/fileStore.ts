import "server-only";

import { assertOrganizerDriveAndGmail } from "@/src/features/connections/server/assertOrganizerDriveAndGmail";
import { logger } from "@/src/lib/logger";
import { driveDelete, driveDownload, drivePut } from "./DriveStore";
import { supabaseDelete, supabaseDownload, supabasePut } from "./SupabaseStore";
import {
  deleteStoredFileRow,
  getStoredFileById,
  insertStoredFile,
  storageRefForFileId,
  updateStoredFile,
} from "./storedFiles.repo";
import { sha256Hex } from "./validateUpload";
import type {
  FilePutInput,
  FilePutResult,
  FileStore,
  FileStreamResult,
  StoredFileRow,
} from "./types";

async function resolveDriveConnectionId(
  organizerId: string,
  explicit?: string,
): Promise<{ ok: true; connectionId: string } | { ok: false; error: string }> {
  if (explicit) return { ok: true, connectionId: explicit };
  const gate = await assertOrganizerDriveAndGmail(organizerId);
  if (!gate.ok) return { ok: false, error: gate.error };
  return { ok: true, connectionId: gate.driveConnectionId };
}

export const fileStore: FileStore = {
  async put(input: FilePutInput): Promise<FilePutResult> {
    const bytes = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes);
    const checksum = input.checksum || sha256Hex(bytes);
    const allowFallback = input.allowFallback !== false;
    const linkLibrary =
      input.linkLibrary ??
      (input.category === "media" ||
        input.category === "certificate" ||
        input.category === "export");

    const driveConn = await resolveDriveConnectionId(input.organizerId, input.connectionId);
    if (driveConn.ok) {
      try {
        const uploaded = await drivePut({
          connectionId: driveConn.connectionId,
          organizerId: input.organizerId,
          eventId: input.eventId,
          folderKind: input.folderKind,
          submissionPath: input.submissionPath,
          name: input.name,
          mime: input.mime,
          bytes,
          actorId: input.actorId,
          linkLibrary,
        });
        const row = await insertStoredFile({
          provider: "drive",
          providerFileId: uploaded.providerFileId,
          connectionId: driveConn.connectionId,
          name: uploaded.name,
          size: uploaded.size,
          mime: input.mime,
          checksum,
          category: input.category,
          entityType: input.entityType,
          entityId: input.entityId,
          organizerId: input.organizerId,
          eventId: input.eventId,
          needsPromote: false,
          expiresAt: null,
          extra: {
            ...(input.extra || {}),
            webUrl: uploaded.webUrl,
          },
        });
        return {
          fileId: row.id,
          provider: "drive",
          providerFileId: row.providerFileId,
          needsPromote: false,
          storageRef: storageRefForFileId(row.id),
          mime: row.mime,
          size: row.size,
          name: row.name,
        };
      } catch (err) {
        logger.error("[fileStore.put] Drive failed", {
          eventId: input.eventId,
          err: err instanceof Error ? err.message : "unknown",
        });
        if (!allowFallback) throw err;
      }
    } else if (!allowFallback) {
      throw new Error(driveConn.error);
    }

    const fallback = await supabasePut({
      organizerId: input.organizerId,
      eventId: input.eventId,
      category: input.category,
      name: input.name,
      mime: input.mime,
      bytes,
    });
    const row = await insertStoredFile({
      provider: "supabase",
      providerFileId: fallback.objectKey,
      connectionId: driveConn.ok ? driveConn.connectionId : null,
      name: input.name,
      size: fallback.size,
      mime: input.mime,
      checksum,
      category: input.category,
      entityType: input.entityType,
      entityId: input.entityId,
      organizerId: input.organizerId,
      eventId: input.eventId,
      needsPromote: true,
      expiresAt: input.expiresAt ?? fallback.expiresAt,
      extra: input.extra || {},
    });
    return {
      fileId: row.id,
      provider: "supabase",
      providerFileId: row.providerFileId,
      needsPromote: true,
      storageRef: storageRefForFileId(row.id),
      mime: row.mime,
      size: row.size,
      name: row.name,
    };
  },

  async get(fileId: string): Promise<StoredFileRow | null> {
    return getStoredFileById(fileId);
  },

  async stream(fileId: string): Promise<FileStreamResult> {
    const row = await getStoredFileById(fileId);
    if (!row) throw Object.assign(new Error("File not found."), { status: 404 });

    if (row.provider === "drive") {
      if (!row.connectionId) {
        throw Object.assign(new Error("Drive connection missing for file."), { status: 503 });
      }
      const downloaded = await driveDownload(row.connectionId, row.providerFileId);
      return {
        body: downloaded.bytes,
        mime: row.mime || downloaded.mime,
        name: row.name || downloaded.name,
        size: downloaded.bytes.length,
      };
    }

    const bytes = await supabaseDownload(row.providerFileId);
    return {
      body: bytes,
      mime: row.mime,
      name: row.name,
      size: bytes.length,
    };
  },

  async delete(fileId: string): Promise<void> {
    const row = await getStoredFileById(fileId);
    if (!row) return;
    try {
      if (row.provider === "drive" && row.connectionId) {
        await driveDelete(row.connectionId, row.providerFileId);
      } else if (row.provider === "supabase") {
        await supabaseDelete(row.providerFileId);
      }
    } catch (err) {
      logger.error("[fileStore.delete] provider delete", {
        fileId,
        err: err instanceof Error ? err.message : "unknown",
      });
    }
    await deleteStoredFileRow(fileId);
  },

  async link(opts): Promise<void> {
    const row = await getStoredFileById(opts.storedFileId);
    if (!row) throw new Error("File not found.");
    await updateStoredFile(opts.storedFileId, {
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      extra: {
        ...row.extra,
        linkedBy: opts.actorId || null,
        linkedAt: new Date().toISOString(),
      },
    });
  },
};

/** Record metadata for a file already uploaded via resumable Drive session. */
export async function recordDriveComplete(opts: {
  connectionId: string;
  organizerId: string;
  eventId: string;
  providerFileId: string;
  name: string;
  mime: string;
  size: number;
  checksum?: string;
  category: FilePutInput["category"];
  entityType: string;
  entityId: string;
  folderKind: FilePutInput["folderKind"];
  actorId?: string;
  linkLibrary?: boolean;
  extra?: Record<string, unknown>;
}): Promise<FilePutResult> {
  const { TABLES } = await import("@/data/collections");
  const { supabaseAdmin } = await import("@/data/supabase");
  const linkLibrary =
    opts.linkLibrary ??
    (opts.category === "media" || opts.category === "certificate" || opts.category === "export");

  if (linkLibrary) {
    const { data: existingLink } = await supabaseAdmin
      .from(TABLES.LINKED_FILES)
      .select("id")
      .eq("connection_id", opts.connectionId)
      .eq("provider_file_id", opts.providerFileId)
      .eq("entity_type", "event")
      .eq("entity_id", opts.eventId)
      .maybeSingle();

    if (existingLink?.id) {
      await supabaseAdmin
        .from(TABLES.LINKED_FILES)
        .update({
          title: opts.name,
          mime_type: opts.mime,
          status: "ok",
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", existingLink.id);
    } else {
      await supabaseAdmin.from(TABLES.LINKED_FILES).insert({
        owner_type: "user",
        owner_id: opts.organizerId,
        connection_id: opts.connectionId,
        provider_file_id: opts.providerFileId,
        entity_type: "event",
        entity_id: opts.eventId,
        added_by: opts.actorId || opts.organizerId,
        title: opts.name,
        mime_type: opts.mime,
        status: "ok",
        last_checked_at: new Date().toISOString(),
      });
    }
  }

  const row = await insertStoredFile({
    provider: "drive",
    providerFileId: opts.providerFileId,
    connectionId: opts.connectionId,
    name: opts.name,
    size: opts.size,
    mime: opts.mime,
    checksum: opts.checksum || "",
    category: opts.category,
    entityType: opts.entityType,
    entityId: opts.entityId,
    organizerId: opts.organizerId,
    eventId: opts.eventId,
    needsPromote: false,
    extra: { ...(opts.extra || {}), folderKind: opts.folderKind },
  });

  return {
    fileId: row.id,
    provider: "drive",
    providerFileId: row.providerFileId,
    needsPromote: false,
    storageRef: storageRefForFileId(row.id),
    mime: row.mime,
    size: row.size,
    name: row.name,
  };
}
