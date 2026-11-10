import "server-only";

import { randomUUID } from "crypto";
import { GoogleCalendarClient } from "../providers/google/calendar";
import { GoogleDriveClient } from "../providers/google/drive";
import type { GoogleMappedError } from "../providers/google/errors";
import { assertMayUseConnection } from "./assertConnectionsAccess";
import { getAccessTokenForConnection, getConnectionById } from "./connections.service";
import { getCalendarIdForConnection } from "./calendarSync.service";
import { ensureAvoelineFolder } from "./linkedFiles.service";
import { formatGoogleMappedError } from "../lib/connectionUserErrors";

function mappedFromErr(err: unknown): GoogleMappedError | null {
  if (err && typeof err === "object" && "mapped" in err) {
    return (err as { mapped: GoogleMappedError }).mapped;
  }
  return null;
}

function failFromErr(err: unknown, fallback: string): { ok: false; error: string; code: string } {
  const mapped = mappedFromErr(err);
  if (mapped) {
    const code =
      mapped.kind === "admin_blocked"
        ? "ADMIN_BLOCKED"
        : mapped.kind === "rate_limit"
          ? "QUOTA"
          : mapped.kind === "invalid_grant"
            ? "NEEDS_RECONNECT"
            : mapped.kind === "scope_missing"
              ? "PERMISSION"
              : "BAD_REQUEST";
    return { ok: false, error: formatGoogleMappedError(mapped), code };
  }
  const message = err instanceof Error ? err.message : fallback;
  return { ok: false, error: message || fallback, code: "BAD_REQUEST" };
}

export async function createAndCleanupTestCalendarEvent(opts: {
  actorId: string;
  connectionId: string;
  withMeet: boolean;
}): Promise<
  | { ok: true; htmlLink: string | null; meetUrl: string | null; cleanedUp: boolean }
  | { ok: false; error: string; code: string }
> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: opts.withMeet ? "meet" : "calendar",
  });
  if (!may.ok) {
    // Meet shares calendar.events — fall back to calendar capability check
    if (opts.withMeet) {
      const cal = await assertMayUseConnection({
        userId: opts.actorId,
        connectionId: opts.connectionId,
        capability: "calendar",
      });
      if (!cal.ok) {
        return {
          ok: false,
          error: "Permission not granted for Calendar and Meet.",
          code: "PERMISSION",
        };
      }
    } else {
      return { ok: false, error: may.error, code: "PERMISSION" };
    }
  }

  const conn = await getConnectionById(opts.connectionId);
  if (!conn || conn.status !== "active") {
    return { ok: false, error: "Connect Google first.", code: "NO_CONNECTION" };
  }

  let token: string;
  try {
    token = await getAccessTokenForConnection(opts.connectionId);
  } catch (err) {
    return failFromErr(err, "Could not refresh Google access.");
  }

  const calendarId = (await getCalendarIdForConnection(opts.connectionId)) || "primary";
  const start = new Date(Date.now() + 5 * 60_000);
  const end = new Date(start.getTime() + 15 * 60_000);
  const requestId = randomUUID();

  let created: Awaited<ReturnType<typeof GoogleCalendarClient.createEvent>>;
  try {
    created = await GoogleCalendarClient.createEvent(token, {
      calendarId,
      withMeet: opts.withMeet,
      requestId,
      sendUpdates: "none",
      payload: {
        summary: opts.withMeet
          ? "Avoeline test Meet (auto-deleted)"
          : "Avoeline test event (auto-deleted)",
        description: "Created by Avoeline Connections smoke test. Safe to ignore.",
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        timeZone: "UTC",
      },
    });
  } catch (err) {
    return failFromErr(err, "Could not create the test calendar event.");
  }

  let cleanedUp = false;
  if (created.eventId) {
    try {
      await GoogleCalendarClient.deleteEvent(token, {
        calendarId,
        eventId: created.eventId,
        sendUpdates: "none",
      });
      cleanedUp = true;
    } catch {
      cleanedUp = false;
    }
  }

  return {
    ok: true,
    htmlLink: created.htmlLink,
    meetUrl: created.meetUrl,
    cleanedUp,
  };
}

export async function createAndCleanupTestDriveFolder(opts: {
  actorId: string;
  connectionId: string;
}): Promise<
  | { ok: true; webViewLink: string | null; name: string; cleanedUp: boolean }
  | { ok: false; error: string; code: string }
> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error, code: "PERMISSION" };

  let token: string;
  try {
    token = await getAccessTokenForConnection(opts.connectionId);
  } catch (err) {
    return failFromErr(err, "Could not refresh Google access.");
  }

  let parentId: string;
  try {
    parentId = await ensureAvoelineFolder(opts.connectionId, token);
  } catch (err) {
    return failFromErr(err, "Could not open the Avoeline Drive folder.");
  }

  const name = `Avoeline test folder ${new Date().toISOString().slice(0, 19)}`;
  let folder: Awaited<ReturnType<typeof GoogleDriveClient.createFolder>>;
  try {
    folder = await GoogleDriveClient.createFolder(token, name, parentId);
  } catch (err) {
    return failFromErr(err, "Could not create the test folder.");
  }

  let cleanedUp = false;
  try {
    await GoogleDriveClient.deleteFile(token, folder.id);
    cleanedUp = true;
  } catch {
    cleanedUp = false;
  }

  return {
    ok: true,
    webViewLink: folder.webViewLink,
    name: folder.name,
    cleanedUp,
  };
}

export async function createAndCleanupTestSheet(opts: {
  actorId: string;
  connectionId: string;
}): Promise<
  | { ok: true; webViewLink: string | null; name: string; cleanedUp: boolean }
  | { ok: false; error: string; code: string }
> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "sheets.sync",
  });
  if (!may.ok) {
    const drive = await assertMayUseConnection({
      userId: opts.actorId,
      connectionId: opts.connectionId,
      capability: "drive.files",
    });
    if (!drive.ok) return { ok: false, error: may.error, code: "PERMISSION" };
  }

  let token: string;
  try {
    token = await getAccessTokenForConnection(opts.connectionId);
  } catch (err) {
    return failFromErr(err, "Could not refresh Google access.");
  }

  let parentId: string;
  try {
    parentId = await ensureAvoelineFolder(opts.connectionId, token);
  } catch (err) {
    return failFromErr(err, "Could not open the Avoeline Drive folder.");
  }

  const name = `Avoeline test sheet ${new Date().toISOString().slice(0, 19)}`;
  let file: Awaited<ReturnType<typeof GoogleDriveClient.createBlankFile>>;
  try {
    file = await GoogleDriveClient.createBlankFile(token, {
      kind: "sheet",
      name,
      parentId,
    });
  } catch (err) {
    return failFromErr(err, "Could not create the test sheet.");
  }

  let cleanedUp = false;
  try {
    await GoogleDriveClient.deleteFile(token, file.id);
    cleanedUp = true;
  } catch {
    cleanedUp = false;
  }

  return {
    ok: true,
    webViewLink: file.webViewLink,
    name: file.name,
    cleanedUp,
  };
}

export async function getAvoelineFolderLink(opts: {
  actorId: string;
  connectionId: string;
}): Promise<
  | { ok: true; webViewLink: string | null; folderId: string }
  | { ok: false; error: string; code: string }
> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "drive.files",
  });
  if (!may.ok) return { ok: false, error: may.error, code: "PERMISSION" };

  let token: string;
  try {
    token = await getAccessTokenForConnection(opts.connectionId);
  } catch (err) {
    return failFromErr(err, "Could not refresh Google access.");
  }

  try {
    const folderId = await ensureAvoelineFolder(opts.connectionId, token);
    const meta = await GoogleDriveClient.getFileMetadata(token, folderId).catch(() => null);
    return {
      ok: true,
      folderId,
      webViewLink:
        meta?.webViewLink ||
        `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`,
    };
  } catch (err) {
    return failFromErr(err, "Could not open the Avoeline Drive folder.");
  }
}
