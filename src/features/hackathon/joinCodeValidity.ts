/**
 * Join codes stay valid until the later of last phase close and event end (docs/22 O2).
 */
export function joinCodeValidUntilIso(opts: {
  eventEndsAtIso?: string | null;
  phaseCloses?: Array<string | null | undefined>;
}): string | null {
  const candidates: number[] = [];
  for (const raw of opts.phaseCloses || []) {
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t)) candidates.push(t);
  }
  if (opts.eventEndsAtIso) {
    const t = new Date(opts.eventEndsAtIso).getTime();
    if (!Number.isNaN(t)) candidates.push(t);
  }
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates)).toISOString();
}
