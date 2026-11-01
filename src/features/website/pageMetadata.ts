import type { Metadata } from "next";
import type { Json } from "@/src/lib/database.types";

export type SeoFallback = {
  title: string;
  description?: string;
  path?: string;
};

type SeoFields = {
  title?: string;
  description?: string;
  ogImage?: string;
  image?: string;
  noindex?: boolean;
};

function asSeo(seo: Json | null | undefined): SeoFields {
  if (!seo || typeof seo !== "object" || Array.isArray(seo)) return {};
  const o = seo as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : undefined;
  const description = typeof o.description === "string" ? o.description.trim() : undefined;
  const ogImage =
    (typeof o.ogImage === "string" && o.ogImage.trim()) ||
    (typeof o.og_image === "string" && o.og_image.trim()) ||
    (typeof o.image === "string" && o.image.trim()) ||
    undefined;
  const noindex = o.noindex === true || o.robots === "noindex";
  return { title: title || undefined, description: description || undefined, ogImage, noindex };
}

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.replace(/\/$/, "") ||
    "https://avoeline-website.vercel.app"
  );
}

/** Build Next.js `Metadata` from `site_pages.seo` with safe fallbacks. */
export function buildPageMetadata(seo: Json | null | undefined, fallback: SeoFallback): Metadata {
  const fields = asSeo(seo);
  const title = fields.title || fallback.title;
  const description = fields.description || fallback.description;
  const origin = siteOrigin();
  const canonical =
    fallback.path != null
      ? `${origin}${fallback.path.startsWith("/") ? fallback.path : `/${fallback.path}`}`
      : undefined;

  const meta: Metadata = {
    title,
    description,
    robots: fields.noindex ? { index: false, follow: false } : { index: true, follow: true },
  };

  if (canonical) {
    meta.alternates = { canonical };
  }

  if (fields.ogImage || description || title) {
    meta.openGraph = {
      title,
      description,
      url: canonical,
      images: fields.ogImage ? [{ url: fields.ogImage }] : undefined,
      type: "website",
    };
    meta.twitter = {
      card: fields.ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: fields.ogImage ? [fields.ogImage] : undefined,
    };
  }

  return meta;
}

export function getSiteOrigin(): string {
  return siteOrigin();
}
