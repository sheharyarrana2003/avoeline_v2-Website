/** Pure validation for site media uploads (docs/19 §6). */

export const SITE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const SITE_MEDIA_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type SiteMediaValidation = { ok: true; alt: string } | { ok: false; error: string };

export function validateSiteMediaUpload(opts: {
  alt: string;
  mime: string;
  size: number;
}): SiteMediaValidation {
  const alt = String(opts.alt ?? "").trim();
  if (!alt) return { ok: false, error: "Alt text is required." };
  if (!SITE_MEDIA_ALLOWED_MIME.has(opts.mime)) {
    return { ok: false, error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }
  if (opts.size > SITE_MEDIA_MAX_BYTES) {
    return { ok: false, error: "Image is too large (max 8MB)." };
  }
  // Explicitly reject SVG / scriptable types even if MIME spoofed in callers.
  if (opts.mime === "image/svg+xml" || opts.mime.includes("svg")) {
    return { ok: false, error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }
  return { ok: true, alt };
}
