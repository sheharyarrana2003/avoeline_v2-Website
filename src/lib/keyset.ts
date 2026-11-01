/**
 * Keyset (cursor) pagination helpers — ENGINEERING_RULES D4.
 * Default page size 25–50 for growing lists (attendees, submissions, audit, announcements).
 */

export const KEYSET_DEFAULT_LIMIT = 25;
export const KEYSET_MAX_LIMIT = 50;

export type KeysetCursor = {
  /** ISO timestamptz of the last row's sort column */
  at: string;
  /** Tie-break primary key */
  id: string;
};

export function clampKeysetLimit(raw: unknown, fallback = KEYSET_DEFAULT_LIMIT): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(KEYSET_MAX_LIMIT, Math.floor(n));
}

export function encodeKeysetCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeKeysetCursor(raw: string | null | undefined): KeysetCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as KeysetCursor;
    if (!parsed?.at || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** PostgREST filter fragment for (created_at, id) descending keyset. */
export function keysetAfterFilter(cursor: KeysetCursor | null): string | null {
  if (!cursor) return null;
  // rows strictly older than the cursor in (at desc, id desc)
  return `and(created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id}))`;
}
