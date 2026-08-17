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
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The public registration link for an event -- the URL organizers share. */
export function registrationPath(eventId: string): string {
    return `/events/${eventId}`;
}
