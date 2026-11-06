/** Pure sender-resolution helpers (unit-testable). */

export type SenderCandidateSource = "event_default" | "personal_default" | "org_grant";

export type SenderCandidate = {
  connectionId: string;
  source: SenderCandidateSource;
};

/**
 * First match wins: event default → personal default → org grant.
 * Callers must already have filtered to connections the actor may use.
 */
export function pickSenderCandidate(opts: {
  eventDefaultId: string | null;
  personalDefaultId: string | null;
  orgGrantId: string | null;
  allowedIds: Set<string>;
}): SenderCandidate | null {
  if (opts.eventDefaultId && opts.allowedIds.has(opts.eventDefaultId)) {
    return { connectionId: opts.eventDefaultId, source: "event_default" };
  }
  if (opts.personalDefaultId && opts.allowedIds.has(opts.personalDefaultId)) {
    return { connectionId: opts.personalDefaultId, source: "personal_default" };
  }
  if (opts.orgGrantId && opts.allowedIds.has(opts.orgGrantId)) {
    return { connectionId: opts.orgGrantId, source: "org_grant" };
  }
  // Fallbacks: any allowed personal/org already encoded in allowedIds order via orgGrantId
  return null;
}

export function connectionDtoHasNoSecrets(dto: Record<string, unknown>): boolean {
  const forbidden = ["encrypted", "refresh", "access_token", "secret", "cipher"];
  const keys = Object.keys(dto).map((k) => k.toLowerCase());
  return !keys.some((k) => forbidden.some((f) => k.includes(f)));
}
