import "server-only";

import { fileStore } from "@/src/features/files/fileStore";
import { publicFileUrl } from "@/src/features/files/storedFiles.repo";
import type { EventFolderKind, FileCategory } from "@/src/features/files/types";

export type EventDriveFolderKind = Exclude<EventFolderKind, never>;

export type DriveUploadResult = {
  providerFileId: string;
  /** Proxy URL — never a raw Drive URL. */
  webUrl: string | null;
  /** `file:{uuid}` storage ref for payment/media paths. */
  storageRef: string;
  fileId: string;
};

/** Refs we accept as FileStore / legacy Drive-backed paths. */
export function isDriveStorageRef(ref: string | null | undefined): boolean {
  const s = String(ref || "");
  return (
    s.startsWith("file:") ||
    s.startsWith("drive:") ||
    s.includes("drive.google.com/") ||
    s.startsWith("/api/files/")
  );
}

export function driveFileIdFromRef(ref: string): string | null {
  if (ref.startsWith("file:")) return ref.slice("file:".length) || null;
  if (ref.startsWith("drive:")) return ref.slice("drive:".length) || null;
  const api = ref.match(/\/api\/files\/([0-9a-f-]{36})/i);
  if (api?.[1]) return api[1];
  const m = ref.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] || null;
}

function categoryForKind(kind: EventDriveFolderKind): FileCategory {
  switch (kind) {
    case "payment_proofs":
      return "payment_proof";
    case "certificates":
      return "certificate";
    case "media":
      return "media";
    case "exports":
      return "export";
    case "submissions":
      return "submission";
    default:
      return "other";
  }
}

/**
 * Upload bytes via FileStore (Drive first, Supabase fallback).
 * QR folder kind removed (A6) — use `/api/qr/[token].png` instead.
 */
export async function uploadEventAssetToOrganizerDrive(opts: {
  organizerId: string;
  eventId: string;
  kind: EventDriveFolderKind;
  fileName: string;
  mimeType: string;
  bytes: Buffer | Uint8Array;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  category?: FileCategory;
  submissionPath?: { competition?: string; team?: string };
  allowFallback?: boolean;
  linkLibrary?: boolean;
}): Promise<DriveUploadResult> {
  const put = await fileStore.put({
    name: opts.fileName,
    mime: opts.mimeType || "application/octet-stream",
    bytes: opts.bytes,
    category: opts.category || categoryForKind(opts.kind),
    entityType: opts.entityType || "event",
    entityId: opts.entityId || opts.eventId,
    organizerId: opts.organizerId,
    eventId: opts.eventId,
    folderKind: opts.kind,
    submissionPath: opts.submissionPath,
    actorId: opts.actorId,
    allowFallback: opts.allowFallback !== false,
    linkLibrary:
      opts.linkLibrary ?? (opts.kind !== "payment_proofs" && opts.kind !== "submissions"),
  });

  return {
    providerFileId: put.providerFileId,
    webUrl: publicFileUrl(put.fileId),
    storageRef: put.storageRef,
    fileId: put.fileId,
  };
}
