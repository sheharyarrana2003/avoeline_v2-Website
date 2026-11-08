import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { GoogleDriveClient } from "@/src/features/connections/providers/google/drive";
import { ensureAvoelineFolder } from "@/src/features/connections/server/linkedFiles.service";
import type { EventFolderKind } from "./types";

const FOLDER_LABEL: Record<EventFolderKind, string> = {
  payment_proofs: "Payment proofs",
  certificates: "Certificates",
  media: "Media",
  exports: "Exports",
  submissions: "Submissions",
};

export function folderLabel(kind: EventFolderKind): string {
  return FOLDER_LABEL[kind];
}

export async function ensureChildFolder(
  accessToken: string,
  parentId: string,
  name: string,
): Promise<string> {
  const safe = name.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${safe}' and '${parentId}' in parents and trashed=false`,
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=5&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (res.ok) {
    const json = (await res.json()) as { files?: { id: string }[] };
    if (json.files?.[0]?.id) return json.files[0].id;
  }
  const created = await GoogleDriveClient.createFolder(accessToken, name, parentId);
  return created.id;
}

/** A6: `Avoeline / <Event title> (<shortId>)` */
export async function eventFolderName(eventId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("title")
    .eq("id", eventId)
    .maybeSingle();
  const title = String(data?.title || "Event")
    .replace(/[\\/:*?"<>|]/g, " ")
    .trim()
    .slice(0, 80);
  const short = eventId.replace(/-/g, "").slice(0, 8);
  return `${title} (${short})`;
}

/**
 * Lazy A6 layout. QR is never a folder kind.
 * Submissions may nest: Submissions / <Competition> / <Team>
 */
export async function resolveEventUploadFolder(opts: {
  connectionId: string;
  accessToken: string;
  eventId: string;
  kind: EventFolderKind;
  submissionPath?: { competition?: string; team?: string };
}): Promise<string> {
  const root = await ensureAvoelineFolder(opts.connectionId, opts.accessToken);
  const eventFolder = await ensureChildFolder(
    opts.accessToken,
    root,
    await eventFolderName(opts.eventId),
  );
  let parent = await ensureChildFolder(opts.accessToken, eventFolder, FOLDER_LABEL[opts.kind]);

  if (opts.kind === "submissions") {
    const competition = opts.submissionPath?.competition?.trim();
    if (competition) {
      parent = await ensureChildFolder(
        opts.accessToken,
        parent,
        competition.replace(/[\\/:*?"<>|]/g, " ").slice(0, 80),
      );
    }
    const team = opts.submissionPath?.team?.trim();
    if (team) {
      parent = await ensureChildFolder(
        opts.accessToken,
        parent,
        team.replace(/[\\/:*?"<>|]/g, " ").slice(0, 80),
      );
    }
  }

  return parent;
}

export function safeFileName(name: string, fallback = "file"): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || fallback
  );
}

export const EVENT_FOLDER_KINDS: EventFolderKind[] = [
  "payment_proofs",
  "certificates",
  "media",
  "exports",
  "submissions",
];

export type EventDriveFolderRow = {
  kind: EventFolderKind | "event_root";
  name: string;
  folderId: string;
  webViewLink: string | null;
};

/** Ensure A6 event root + standard subfolders; return rows for Files tab. */
export async function listEventDriveFolders(opts: {
  connectionId: string;
  accessToken: string;
  eventId: string;
}): Promise<{ eventFolderId: string; folders: EventDriveFolderRow[] }> {
  const root = await ensureAvoelineFolder(opts.connectionId, opts.accessToken);
  const eventName = await eventFolderName(opts.eventId);
  const eventFolderId = await ensureChildFolder(opts.accessToken, root, eventName);
  const folders: EventDriveFolderRow[] = [];

  const rootMeta = await GoogleDriveClient.getFileMetadata(opts.accessToken, eventFolderId).catch(
    () => null,
  );
  folders.push({
    kind: "event_root",
    name: eventName,
    folderId: eventFolderId,
    webViewLink: rootMeta?.webViewLink || null,
  });

  for (const kind of EVENT_FOLDER_KINDS) {
    const id = await ensureChildFolder(opts.accessToken, eventFolderId, FOLDER_LABEL[kind]);
    const meta = await GoogleDriveClient.getFileMetadata(opts.accessToken, id).catch(() => null);
    folders.push({
      kind,
      name: FOLDER_LABEL[kind],
      folderId: id,
      webViewLink: meta?.webViewLink || null,
    });
  }

  return { eventFolderId, folders };
}

/** Parent folder id for creating linked Docs under an event (not Avoeline root). */
export async function resolveEventRootFolderId(opts: {
  connectionId: string;
  accessToken: string;
  eventId: string;
}): Promise<string> {
  const { eventFolderId } = await listEventDriveFolders(opts);
  return eventFolderId;
}
