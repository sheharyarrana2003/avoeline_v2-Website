/**
 * In-memory rate limiter (ENGINEERING_RULES S6).
 * Swap the Map for Redis/KV later without changing call sites.
 */

export type RateLimitResult =
  { ok: true; remaining: number } | { ok: false; remaining: 0; retryAfterSec: number };

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Prune stale buckets occasionally so long-lived processes do not grow forever. */
const PRUNE_EVERY = 200;
let ops = 0;

function prune(now: number): void {
  ops += 1;
  if (ops % PRUNE_EVERY !== 0) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

/**
 * @param key - Stable identity (e.g. `login:${email}`, `flag:${teamId}`)
 * @param limit - Max successes inside the window
 * @param windowSec - Window length in seconds
 */
export function rateLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  prune(now);
  const windowMs = Math.max(1, windowSec) * 1000;
  const max = Math.max(1, limit);
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true, remaining: max - existing.count };
}

/** Test helper — clears all buckets. */
export function __resetRateLimitForTests(): void {
  store.clear();
  ops = 0;
}
