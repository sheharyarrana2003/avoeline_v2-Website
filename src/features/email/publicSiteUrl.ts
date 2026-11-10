/** Absolute public URL without requiring request headers (cron / outbox / tests). */
export function publicSiteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (configured) return `${configured}${normalized}`;
  return `http://localhost:3000${normalized}`;
}
