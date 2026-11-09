import { headers } from "next/headers";

/**
 * An absolute URL for this deployment.
 *
 * Prefer `NEXT_PUBLIC_SITE_URL` when set (production / custom domains such as
 * avoeline.aroxes.com). Without it, derive from the incoming request so local
 * `next dev` and Vercel preview hosts still work.
 *
 * OAuth: Google sign-in passes this origin into Supabase `redirectTo`
 * (`/auth/callback`). Supabase Site URL + Redirect allow list must also match
 * the public domain — otherwise Auth falls back to Site URL (often localhost).
 *
 * Server-only: `headers()` throws outside a request scope.
 */
export async function absoluteUrl(path: string): Promise<string> {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (configured) {
    return `${configured}${normalized}`;
  }

  const h = await headers();

  // A chain of proxies appends rather than replaces, so these can arrive as
  // "a.com, b.internal" -- the first entry is the host the visitor actually
  // typed, which is the one belonging in an emailed link.
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;

  // `x-forwarded-host` before `host`: behind Vercel's edge, and behind any
  // rewrite or proxy, `host` can be the internal hostname the request was
  // routed to rather than the domain the visitor is on. Getting that wrong
  // puts an unreachable link in an email nobody can correct afterwards.
  const host = first(h.get("x-forwarded-host")) ?? first(h.get("host")) ?? "localhost:3000";
  const proto =
    first(h.get("x-forwarded-proto")) ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}${normalized}`;
}

/** The public registration link for an event -- the URL organizers share. */
export function registrationPath(eventId: string): string {
  return `/events/${eventId}`;
}

/**
 * Signed-out visitors belong on sign-in, not sign-up. `next` is only attached
 * when it is a same-origin path — the same rule the sign-in page re-checks.
 */
export function signInPath(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/auth/signin";
  }
  return `/auth/signin?next=${encodeURIComponent(next)}`;
}
