import { randomInt } from "crypto";

/** Crockford base32 without I L O U (unambiguous). */
export const SHORT_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const PREFIX = "AVO";
const BODY_LEN = 6;

/** Generate a display short code like AVO-K7Q4M2. */
export function generateShortCode(): string {
  let body = "";
  for (let i = 0; i < BODY_LEN; i++) {
    body += SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)];
  }
  return `${PREFIX}-${body}`;
}

/** Uppercase, strip spaces; ensure AVO- prefix for storage/compare. */
export function formatShortCode(raw: string): string {
  const compact = String(raw || "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  if (!compact) return "";
  const withoutPrefix = compact.startsWith(PREFIX) ? compact.slice(PREFIX.length) : compact;
  const body = withoutPrefix.slice(0, BODY_LEN);
  if (body.length !== BODY_LEN) return `${PREFIX}-${body}`;
  return `${PREFIX}-${body}`;
}

/**
 * Normalize for search/lookup: uppercase alphanumerics only (no hyphen),
 * so AVO-K7Q4M2, avo k7q4m2, and K7Q4M2 all compare.
 */
export function normalizeShortCode(raw: unknown): string {
  const s = String(raw || "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  if (!s) return "";
  if (s.startsWith(PREFIX) && s.length >= PREFIX.length + BODY_LEN) {
    return s.slice(0, PREFIX.length + BODY_LEN);
  }
  if (s.length === BODY_LEN) return `${PREFIX}${s}`;
  if (s.startsWith(PREFIX)) return s;
  return s;
}

export function shortCodesEqual(a: unknown, b: unknown): boolean {
  const na = normalizeShortCode(a);
  const nb = normalizeShortCode(b);
  return Boolean(na && nb && na === nb);
}

/** True if needle (already lowercased haystack search) matches short code variants. */
export function shortCodeMatchesNeedle(
  shortCode: string | null | undefined,
  needle: string,
): boolean {
  if (!needle || !shortCode) return false;
  const n = needle.toLowerCase().replace(/[^0-9a-z]/g, "");
  const code = normalizeShortCode(shortCode).toLowerCase();
  if (!n || !code) return false;
  if (code.includes(n) || n.includes(code)) return true;
  const body = code.startsWith("avo") ? code.slice(3) : code;
  return body.includes(n) || n.includes(body);
}
