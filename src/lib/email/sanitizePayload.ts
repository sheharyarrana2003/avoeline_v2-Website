/** Strip keys that must never appear in email payloads or logs. */
export function sanitizeEmailPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const banned = new Set([
    "password",
    "temporaryPassword",
    "tempPassword",
    "internalNotes",
    "internal_notes",
    "notes",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (banned.has(k)) continue;
    out[k] = v;
  }
  return out;
}
