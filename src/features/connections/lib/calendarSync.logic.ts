/** Pure calendar sync helpers for unit tests. */

export type CalendarLinkStatus = "pending" | "synced" | "deleted" | "error";

export function nextLinkStatusAfterUpsert(opts: {
  hadGoogleEventId: boolean;
  meetPending: boolean;
  error?: string | null;
}): CalendarLinkStatus {
  if (opts.error) return "error";
  if (opts.meetPending) return "pending";
  return "synced";
}

export function nextLinkStatusAfterDelete(opts: {
  googleDeleted: boolean;
  error?: string | null;
}): CalendarLinkStatus {
  if (opts.error) return "error";
  return opts.googleDeleted ? "deleted" : "error";
}

export function shouldCreateVsUpdate(
  googleEventId: string | null | undefined,
): "create" | "update" {
  return googleEventId ? "update" : "create";
}

export function idempotentRequestId(
  existingRequestId: string | null | undefined,
  computed: string,
): string {
  return existingRequestId || computed;
}

/** Fail closed: sync requires calendar capability and (personal owner or grant). */
export function maySyncCalendar(opts: {
  hasCalendarCapability: boolean;
  isOwner: boolean;
  hasGrant: boolean;
}): boolean {
  if (!opts.hasCalendarCapability) return false;
  return opts.isOwner || opts.hasGrant;
}

export function resolveMeetUrlAfterPoll(opts: {
  attempts: number;
  maxAttempts: number;
  meetUrl: string | null;
}): { meetUrl: string | null; stillPending: boolean } {
  if (opts.meetUrl) return { meetUrl: opts.meetUrl, stillPending: false };
  if (opts.attempts >= opts.maxAttempts) return { meetUrl: null, stillPending: false };
  return { meetUrl: null, stillPending: true };
}

/** Google payloads store UTC ISO; display uses entity timezone. */
export function toGoogleUtcIso(localOrIso: string): string {
  return new Date(localOrIso).toISOString();
}
