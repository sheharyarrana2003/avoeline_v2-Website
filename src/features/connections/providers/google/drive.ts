import {
  chunkSheetRows,
  computeGoogleRetryWaitMs,
  SHEET_WRITE_CHUNK_ROWS,
} from "../../lib/sheetWrite.logic";
import { mapGoogleApiError } from "./errors";

export const MIME = {
  folder: "application/vnd.google-apps.folder",
  doc: "application/vnd.google-apps.document",
  sheet: "application/vnd.google-apps.spreadsheet",
  slides: "application/vnd.google-apps.presentation",
} as const;

export type DriveFileKind = "doc" | "sheet" | "slides";

export type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  iconLink: string | null;
  modifiedTime: string | null;
};

export type DriveAccessStatus = "ok" | "missing" | "no_access";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function googleFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (res.status === 429 || res.status >= 500) {
    const mapped = mapGoogleApiError(
      res.status,
      await res
        .clone()
        .text()
        .catch(() => ""),
    );
    const wait = computeGoogleRetryWaitMs(
      res.status,
      attempt,
      mapped.kind === "rate_limit" ? mapped.retryAfterMs : undefined,
    );
    if (wait != null) {
      await sleep(wait);
      return googleFetch(accessToken, url, init, attempt + 1);
    }
  }
  return res;
}

export function mapHttpToAccessStatus(status: number): DriveAccessStatus {
  if (status === 200 || status === 204) return "ok";
  if (status === 404) return "missing";
  if (status === 403 || status === 401) return "no_access";
  return "no_access";
}

export const GoogleDriveClient = {
  async getFileMetadata(accessToken: string, fileId: string): Promise<DriveFileMetadata> {
    const fields = "id,name,mimeType,webViewLink,iconLink,modifiedTime";
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`,
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: res.status });
    }
    const json = JSON.parse(text) as Record<string, string | undefined>;
    if (!json.id || !json.name || !json.mimeType) {
      throw new Error("Drive file metadata incomplete.");
    }
    return {
      id: json.id,
      name: json.name,
      mimeType: json.mimeType,
      webViewLink: json.webViewLink || null,
      iconLink: json.iconLink || null,
      modifiedTime: json.modifiedTime || null,
    };
  },

  async createFolder(
    accessToken: string,
    name: string,
    parentId?: string,
  ): Promise<DriveFileMetadata> {
    const body: Record<string, unknown> = {
      name,
      mimeType: MIME.folder,
    };
    if (parentId) body.parents = [parentId];
    const res = await googleFetch(
      accessToken,
      "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,iconLink,modifiedTime",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    const json = JSON.parse(text) as Record<string, string | undefined>;
    return {
      id: json.id!,
      name: json.name || name,
      mimeType: json.mimeType || MIME.folder,
      webViewLink: json.webViewLink || null,
      iconLink: json.iconLink || null,
      modifiedTime: json.modifiedTime || null,
    };
  },

  async createBlankFile(
    accessToken: string,
    opts: { kind: DriveFileKind; name: string; parentId: string },
  ): Promise<DriveFileMetadata> {
    const mimeType = MIME[opts.kind];
    const res = await googleFetch(
      accessToken,
      "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,iconLink,modifiedTime",
      {
        method: "POST",
        body: JSON.stringify({
          name: opts.name,
          mimeType,
          parents: [opts.parentId],
        }),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    const json = JSON.parse(text) as Record<string, string | undefined>;
    return {
      id: json.id!,
      name: json.name || opts.name,
      mimeType: json.mimeType || mimeType,
      webViewLink: json.webViewLink || null,
      iconLink: json.iconLink || null,
      modifiedTime: json.modifiedTime || null,
    };
  },

  async verifyAccess(accessToken: string, fileId: string): Promise<DriveAccessStatus> {
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id&supportsAllDrives=true`,
    );
    if (res.ok) return "ok";
    return mapHttpToAccessStatus(res.status);
  },

  /** Replace all values on the first sheet (RAW — formula injection already sanitized). Chunked writes. */
  async clearAndWriteSheetValues(
    accessToken: string,
    spreadsheetId: string,
    values: Array<Array<string | number | boolean>>,
    sheetTitle = "Sheet1",
  ): Promise<void> {
    const clearRange = encodeURIComponent(`${sheetTitle}!A1`);
    const clearRes = await googleFetch(
      accessToken,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${clearRange}:clear`,
      { method: "POST", body: "{}" },
    );
    if (!clearRes.ok) {
      const text = await clearRes.text();
      const mapped = mapGoogleApiError(clearRes.status, text);
      throw Object.assign(new Error(mapped.message), {
        mapped,
        httpStatus: clearRes.status,
      });
    }
    if (!values.length) return;

    const chunks = chunkSheetRows(values, SHEET_WRITE_CHUNK_ROWS);
    let startRow = 1;
    for (const chunk of chunks) {
      const a1 = `${sheetTitle}!A${startRow}`;
      const updateRes = await googleFetch(
        accessToken,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(a1)}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({
            range: a1,
            majorDimension: "ROWS",
            values: chunk,
          }),
        },
      );
      if (!updateRes.ok) {
        const text = await updateRes.text();
        const mapped = mapGoogleApiError(updateRes.status, text);
        throw Object.assign(new Error(mapped.message), {
          mapped,
          httpStatus: updateRes.status,
        });
      }
      startRow += chunk.length;
    }
  },

  /** Read cell values from the first sheet (or named title). */
  async readSheetValues(
    accessToken: string,
    spreadsheetId: string,
    sheetTitle = "Sheet1",
    maxRows = 2000,
  ): Promise<string[][]> {
    const range = encodeURIComponent(`${sheetTitle}!A1:ZZ${Math.max(1, Math.min(maxRows, 5000))}`);
    const res = await googleFetch(
      accessToken,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS`,
    );
    if (!res.ok) {
      const text = await res.text();
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: res.status });
    }
    const json = (await res.json()) as { values?: unknown[][] };
    return (json.values || []).map((row) =>
      (Array.isArray(row) ? row : []).map((cell) => String(cell ?? "").trim()),
    );
  },

  /**
   * Multipart upload of binary bytes into a Drive folder.
   * Uses uploadType=multipart (metadata JSON + media).
   */
  async uploadBinaryFile(
    accessToken: string,
    opts: {
      name: string;
      mimeType: string;
      parentId: string;
      bytes: Buffer | Uint8Array;
    },
  ): Promise<DriveFileMetadata> {
    const meta = JSON.stringify({
      name: opts.name,
      mimeType: opts.mimeType,
      parents: [opts.parentId],
    });
    const boundary = `avoeline_${Date.now().toString(36)}`;
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
          `--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`,
      ),
      Buffer.from(opts.bytes),
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,modifiedTime&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: res.status });
    }
    const json = JSON.parse(text) as Record<string, string | undefined>;
    return {
      id: json.id!,
      name: json.name || opts.name,
      mimeType: json.mimeType || opts.mimeType,
      webViewLink: json.webViewLink || null,
      iconLink: json.iconLink || null,
      modifiedTime: json.modifiedTime || null,
    };
  },

  /** Insert plain text at the start of a Google Doc the app created. */
  async writeDocPlainText(accessToken: string, documentId: string, body: string): Promise<void> {
    const res = await googleFetch(
      accessToken,
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: body.slice(0, 48000),
              },
            },
          ],
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
  },

  /** Download file bytes (not Google Docs export — binary uploads only). */
  async downloadBinaryFile(
    accessToken: string,
    fileId: string,
  ): Promise<{ bytes: Buffer; mime: string; name: string }> {
    const meta = await GoogleDriveClient.getFileMetadata(accessToken, fileId);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: res.status });
    }
    const ab = await res.arrayBuffer();
    return {
      bytes: Buffer.from(ab),
      mime: meta.mimeType,
      name: meta.name,
    };
  },

  async deleteFile(accessToken: string, fileId: string): Promise<void> {
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: res.status });
    }
  },

  /**
   * Start a resumable upload session. Returns the session URL for the browser
   * to PUT bytes directly (Origin must match the initiating request).
   */
  async createResumableUploadSession(
    accessToken: string,
    opts: {
      name: string;
      mimeType: string;
      parentId: string;
      size: number;
      origin: string;
    },
  ): Promise<string> {
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,iconLink,modifiedTime",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": opts.mimeType,
          "X-Upload-Content-Length": String(opts.size),
          Origin: opts.origin,
        },
        body: JSON.stringify({
          name: opts.name,
          mimeType: opts.mimeType,
          parents: [opts.parentId],
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: res.status });
    }
    const sessionUrl = res.headers.get("location") || res.headers.get("Location");
    if (!sessionUrl) {
      throw new Error("Drive did not return a resumable session URL.");
    }
    return sessionUrl;
  },

  /**
   * O7 opt-in: make a file readable by anyone with the link.
   * Returns a webViewLink suitable for email (not the private FileStore proxy).
   */
  async shareAnyoneWithLink(accessToken: string, fileId: string): Promise<string> {
    const permRes = await googleFetch(
      accessToken,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`,
      {
        method: "POST",
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
          allowFileDiscovery: false,
        }),
      },
    );
    if (!permRes.ok) {
      const text = await permRes.text();
      const mapped = mapGoogleApiError(permRes.status, text);
      throw Object.assign(new Error(mapped.message), { mapped, httpStatus: permRes.status });
    }
    const meta = await googleFetch(
      accessToken,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=webViewLink,webContentLink&supportsAllDrives=true`,
    );
    if (!meta.ok) {
      throw new Error("Could not read Drive share link.");
    }
    const json = (await meta.json()) as { webViewLink?: string; webContentLink?: string };
    const url = json.webViewLink || json.webContentLink;
    if (!url) throw new Error("Drive did not return a share URL.");
    return url;
  },
};
