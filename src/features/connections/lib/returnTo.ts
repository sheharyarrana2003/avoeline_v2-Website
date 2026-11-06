/** Same-origin returnTo validation (no server-only — unit-testable). */
export function sameOriginReturnTo(returnTo: string, origin: string): string {
  try {
    if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      return returnTo;
    }
    const url = new URL(returnTo, origin);
    if (url.origin !== origin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
