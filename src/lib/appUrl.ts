import { headers } from "next/headers";

/**
 * An absolute URL for this deployment, built from the incoming request.
 *
 * Absolute links were hardcoded and disagreed with each other: the publish
 * success screen handed organizers `https://avoeline.com/...` while the
 * certificate service pointed at `https://eventflow.com/...`, and neither
 * matches the Vercel host the app actually runs on. A link that is wrong in dev
 * is merely annoying; one that is wrong inside a sent email cannot be corrected
 * afterwards.
 *
 * Derived from the request rather than an env var so there is nothing to
 * configure and nothing to keep in step across environments -- dev, preview and
 * production each describe themselves correctly. `x-forwarded-proto` is what a
 * proxy sets, and behind Vercel it is always present; the localhost fallback is
 * for `next dev`, which is served over http.
 *
 * Server-only: `headers()` throws outside a request scope.
 */
export async function absoluteUrl(path: string): Promise<string> {
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

    return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
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
