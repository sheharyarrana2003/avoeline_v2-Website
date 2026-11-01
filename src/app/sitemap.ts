import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/src/features/website/pageMetadata";
import { MARKETING_SITEMAP_PATHS } from "@/src/features/website/seo.logic";

/** Public marketing + events index. App prefixes stay out of the sitemap. */
const SITEMAP_PATHS = [...MARKETING_SITEMAP_PATHS, "/events"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const now = new Date();
  return SITEMAP_PATHS.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
    lastModified: now,
    changeFrequency: path === "/" || path === "/plans" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/plans" ? 0.9 : 0.7,
  }));
}
