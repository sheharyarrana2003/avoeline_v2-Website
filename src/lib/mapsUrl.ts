/**
 * Maps link helpers — https-only; Google embed allowlist for iframes.
 */

export function isValidMapsUrl(raw: string | null | undefined): boolean {
  const s = String(raw || "").trim();
  if (!s) return true; // empty is ok (optional)
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Google Maps embed URLs safe for iframe (CSP allowlisted). */
export function isGoogleEmbedUrl(raw: string | null | undefined): boolean {
  const s = String(raw || "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    if (host === "www.google.com" || host === "google.com" || host.endsWith(".google.com")) {
      return path.includes("/maps/embed") || path.includes("/maps/embed/");
    }
    return false;
  } catch {
    return false;
  }
}

export function openInMapsHref(raw: string | null | undefined): string | null {
  const s = String(raw || "").trim();
  if (!s || !isValidMapsUrl(s)) return null;
  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}

export function mapsUrlHint(): string {
  return "In Google Maps, open the place → Share → Copy link, then paste here. Short links (maps.app.goo.gl) work too.";
}
