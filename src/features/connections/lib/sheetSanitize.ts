/** Formula-injection guards for Google Sheets cell values (docs/17 §8). */

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/**
 * Neutralize spreadsheet formula injection.
 * Prefix with apostrophe when the value would be interpreted as a formula.
 */
export function sanitizeSheetCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  let s = String(value);
  // Strip control chars except tab/newline which Sheets may display oddly — neutralize leading.
  s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  if (DANGEROUS_PREFIX.test(s)) return `'${s}`;
  return s;
}

export function sanitizeSheetRow(cells: unknown[]): Array<string | number | boolean> {
  return cells.map(sanitizeSheetCell);
}

export function sanitizeSheetMatrix(rows: unknown[][]): Array<Array<string | number | boolean>> {
  return rows.map(sanitizeSheetRow);
}

/** Stable fingerprint so unchanged data skips a rewrite. */
export function sheetRowsFingerprint(matrix: unknown[][]): string {
  const safe = sanitizeSheetMatrix(matrix);
  let h = 0;
  const text = JSON.stringify(safe);
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return `${safe.length}:${h.toString(16)}`;
}

export function shouldRewriteSheet(opts: {
  previousFingerprint: string | null | undefined;
  nextFingerprint: string;
}): boolean {
  if (!opts.previousFingerprint) return true;
  return opts.previousFingerprint !== opts.nextFingerprint;
}

export type SheetSyncPauseReason = "missing" | "no_access" | "error";

export function pauseMessage(reason: SheetSyncPauseReason): string {
  if (reason === "missing") {
    return "Sync paused: the Google Sheet was deleted. Export again to create a new one.";
  }
  if (reason === "no_access") {
    return "Sync paused: Google Drive access was revoked. Reconnect Drive and export again.";
  }
  return "Sync paused due to an error. Check Connections and try again.";
}

export function pauseReasonFromHttp(httpStatus: number | undefined | null): SheetSyncPauseReason {
  if (httpStatus === 404) return "missing";
  if (httpStatus === 403 || httpStatus === 401) return "no_access";
  return "error";
}
