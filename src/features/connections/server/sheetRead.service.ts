import "server-only";

import { getAccessTokenForConnection } from "./connections.service";
import { assertMayUseConnection } from "./assertConnectionsAccess";
import { GoogleDriveClient } from "../providers/google/drive";

/**
 * Read a Google Sheet as a string matrix for an authorized actor.
 * Keeps GoogleDriveClient imports inside connections/server (C6).
 */
export async function readSpreadsheetValuesForActor(opts: {
  actorId: string;
  connectionId: string;
  spreadsheetId: string;
  sheetTitle?: string;
  maxRows?: number;
}): Promise<string[][]> {
  const may = await assertMayUseConnection({
    userId: opts.actorId,
    connectionId: opts.connectionId,
    capability: "drive.files",
  });
  if (!may.ok) {
    const sheets = await assertMayUseConnection({
      userId: opts.actorId,
      connectionId: opts.connectionId,
      capability: "sheets.sync",
    });
    if (!sheets.ok) throw new Error(may.error);
  }
  const token = await getAccessTokenForConnection(opts.connectionId);
  return GoogleDriveClient.readSheetValues(
    token,
    opts.spreadsheetId,
    opts.sheetTitle,
    opts.maxRows,
  );
}
