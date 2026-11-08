import "server-only";

import { GoogleDriveClient } from "@/src/features/connections/providers/google/drive";
import { getAccessTokenForConnection } from "@/src/features/connections/server/connections.service";
import { writeConnectionAudit } from "@/src/features/connections/server/audit.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { resolveEventUploadFolder, safeFileName } from "./folders";
import type { EventFolderKind } from "./types";

export type DrivePutOpts = {
  connectionId: string;
  organizerId: string;
  eventId: string;
  folderKind: EventFolderKind;
  submissionPath?: { competition?: string; team?: string };
  name: string;
  mime: string;
  bytes: Buffer | Uint8Array;
  actorId?: string;
  linkLibrary?: boolean;
};

export type DrivePutResult = {
  providerFileId: string;
  webUrl: string | null;
  mime: string;
  name: string;
  size: number;
};

export async function drivePut(opts: DrivePutOpts): Promise<DrivePutResult> {
  const token = await getAccessTokenForConnection(opts.connectionId);
  const parentId = await resolveEventUploadFolder({
    connectionId: opts.connectionId,
    accessToken: token,
    eventId: opts.eventId,
    kind: opts.folderKind,
    submissionPath: opts.submissionPath,
  });

  const name = safeFileName(opts.name);
  const meta = await GoogleDriveClient.uploadBinaryFile(token, {
    name,
    mimeType: opts.mime || "application/octet-stream",
    parentId,
    bytes: opts.bytes,
  });

  if (opts.linkLibrary !== false) {
    await upsertLinkedFile({
      connectionId: opts.connectionId,
      organizerId: opts.organizerId,
      eventId: opts.eventId,
      actorId: opts.actorId || opts.organizerId,
      providerFileId: meta.id,
      title: meta.name,
      mime: opts.mime,
      webUrl: meta.webViewLink,
      iconUrl: meta.iconLink,
      providerModifiedAt: meta.modifiedTime,
    });
  }

  await writeConnectionAudit({
    connectionId: opts.connectionId,
    ownerType: "user",
    ownerId: opts.organizerId,
    actorId: opts.actorId || opts.organizerId,
    action: "drive.upload",
    details: {
      eventId: opts.eventId,
      kind: opts.folderKind,
      fileId: meta.id,
      name: meta.name,
    },
  }).catch(() => undefined);

  return {
    providerFileId: meta.id,
    webUrl: meta.webViewLink,
    mime: opts.mime,
    name: meta.name,
    size: Buffer.byteLength(opts.bytes),
  };
}

async function upsertLinkedFile(opts: {
  connectionId: string;
  organizerId: string;
  eventId: string;
  actorId: string;
  providerFileId: string;
  title: string;
  mime: string;
  webUrl: string | null;
  iconUrl: string | null;
  providerModifiedAt: string | null;
}): Promise<void> {
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
        title: opts.title,
        mime_type: opts.mime || "application/octet-stream",
        web_url: opts.webUrl,
        icon_url: opts.iconUrl,
        status: "ok",
        last_checked_at: new Date().toISOString(),
        provider_modified_at: opts.providerModifiedAt || null,
      })
      .eq("id", existingLink.id);
    return;
  }

  await supabaseAdmin.from(TABLES.LINKED_FILES).insert({
    owner_type: "user",
    owner_id: opts.organizerId,
    connection_id: opts.connectionId,
    provider_file_id: opts.providerFileId,
    entity_type: "event",
    entity_id: opts.eventId,
    added_by: opts.actorId,
    title: opts.title,
    mime_type: opts.mime || "application/octet-stream",
    web_url: opts.webUrl,
    icon_url: opts.iconUrl,
    status: "ok",
    last_checked_at: new Date().toISOString(),
    provider_modified_at: opts.providerModifiedAt || null,
  });
}

export async function driveDownload(
  connectionId: string,
  providerFileId: string,
): Promise<{ bytes: Buffer; mime: string; name: string }> {
  const token = await getAccessTokenForConnection(connectionId);
  return GoogleDriveClient.downloadBinaryFile(token, providerFileId);
}

export async function driveDelete(connectionId: string, providerFileId: string): Promise<void> {
  const token = await getAccessTokenForConnection(connectionId);
  await GoogleDriveClient.deleteFile(token, providerFileId);
}

export async function createResumableSession(opts: {
  connectionId: string;
  eventId: string;
  folderKind: EventFolderKind;
  submissionPath?: { competition?: string; team?: string };
  name: string;
  mime: string;
  size: number;
  origin: string;
}): Promise<{ sessionUrl: string; parentId: string }> {
  const token = await getAccessTokenForConnection(opts.connectionId);
  const parentId = await resolveEventUploadFolder({
    connectionId: opts.connectionId,
    accessToken: token,
    eventId: opts.eventId,
    kind: opts.folderKind,
    submissionPath: opts.submissionPath,
  });

  const sessionUrl = await GoogleDriveClient.createResumableUploadSession(token, {
    name: safeFileName(opts.name),
    mimeType: opts.mime,
    parentId,
    size: opts.size,
    origin: opts.origin,
  });

  return { sessionUrl, parentId };
}

/** Verify a Drive file after resumable upload (size/mime when available). */
export async function driveVerifyUploadedFile(
  connectionId: string,
  providerFileId: string,
): Promise<{ id: string; name: string; mimeType: string; size: number | null }> {
  const token = await getAccessTokenForConnection(connectionId);
  const meta = await GoogleDriveClient.getFileMetadata(token, providerFileId);
  const detailRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(providerFileId)}?fields=id,name,mimeType,size&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  let size: number | null = null;
  let mimeType = meta.mimeType;
  if (detailRes.ok) {
    const detail = (await detailRes.json()) as { size?: string; mimeType?: string };
    if (detail.size != null) size = Number(detail.size);
    if (detail.mimeType) mimeType = detail.mimeType;
  }
  return { id: meta.id, name: meta.name, mimeType, size };
}
