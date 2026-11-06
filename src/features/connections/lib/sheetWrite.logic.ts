/** Pure helpers for Sheets batch writes, retry waits, and sync failure policy. */

export const SHEET_WRITE_CHUNK_ROWS = 400;
export const GOOGLE_FETCH_MAX_RETRIES = 3;

export function chunkSheetRows<T>(matrix: T[], size = SHEET_WRITE_CHUNK_ROWS): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1");
  if (!matrix.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < matrix.length; i += size) {
    out.push(matrix.slice(i, i + size));
  }
  return out;
}

/** A1 range for a chunk starting at 1-based `startRow` (inclusive). */
export function sheetChunkRange(sheetTitle: string, startRow: number, rowCount: number): string {
  if (startRow < 1 || rowCount < 1) throw new Error("invalid sheet chunk range");
  const endRow = startRow + rowCount - 1;
  return `${sheetTitle}!A${startRow}:A${endRow}`;
}

/** Wait before retrying a Google API call (attempt is 0-based before next try). */
export function computeGoogleRetryWaitMs(
  status: number,
  attempt: number,
  retryAfterMs?: number,
): number | null {
  if (!(status === 429 || status >= 500)) return null;
  if (attempt >= GOOGLE_FETCH_MAX_RETRIES) return null;
  if (status === 429 && retryAfterMs && retryAfterMs > 0) return retryAfterMs;
  return 500 * 2 ** attempt;
}

export type SheetWriteFailureAction = "pause" | "defer" | "error";

/**
 * Map HTTP failure after retries to sync policy:
 * - pause: deleted / revoked (clear keep_in_sync)
 * - defer: quota — leave active for cron/hooks
 * - error: other — pause with generic message
 */
export function classifySheetWriteFailure(
  httpStatus: number | undefined | null,
): SheetWriteFailureAction {
  if (httpStatus === 404) return "pause";
  if (httpStatus === 403 || httpStatus === 401) return "pause";
  if (httpStatus === 429) return "defer";
  if (httpStatus != null && httpStatus >= 500) return "defer";
  return "error";
}

export function quotaDeferMessage(): string {
  return "Google Sheets quota exceeded. Sync left active and will retry on the next job or event update.";
}
