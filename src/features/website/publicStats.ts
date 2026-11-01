/** Pure helpers for public aggregate stats (no personal fields). */

export type PublicStats = {
  events_count: number;
  registrations_count: number;
  active_organizers_count: number;
  institutions_count: number;
  certificates_count: number;
};

export const PUBLIC_STATS_KEYS = [
  "events_count",
  "registrations_count",
  "active_organizers_count",
  "institutions_count",
  "certificates_count",
] as const;

/** Map RPC row → numeric aggregates only (strips any extra keys). */
export function normalizePublicStats(
  row: Record<string, unknown> | null | undefined,
): PublicStats | null {
  if (!row || typeof row !== "object") return null;
  return {
    events_count: Number(row.events_count ?? 0),
    registrations_count: Number(row.registrations_count ?? 0),
    active_organizers_count: Number(row.active_organizers_count ?? 0),
    institutions_count: Number(row.institutions_count ?? 0),
    certificates_count: Number(row.certificates_count ?? 0),
  };
}
