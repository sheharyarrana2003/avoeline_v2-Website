/** Cache tags for marketing CMS content (Next.js `revalidateTag` / `unstable_cache`). */

export const SITE_NAV = "site:nav" as const;
export const SITE_STATS = "site:stats" as const;
export const SITE_SETTINGS = "site:settings" as const;
export const SITE_PLANS = "site:plans" as const;
export const SITE_EVENTS = "site:events" as const;
export const SITE_ALL = "site:all" as const;

export function sitePage(slug: string): string {
  return `site:page:${slug}`;
}
