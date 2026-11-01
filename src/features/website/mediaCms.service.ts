import "server-only";

import { TABLES } from "@/data/collections";
import { MEDIA_BUCKET, supabaseAdmin } from "@/data/supabase";
import type { Database } from "@/src/lib/database.types";
import { logger } from "@/src/lib/logger";
import { parseTags } from "./cms.logic";
import { validateSiteMediaUpload } from "./media.logic";

type MediaRow = Database["public"]["Tables"]["site_media"]["Row"];

export async function listSiteMedia(limit = 100): Promise<MediaRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_MEDIA)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listSiteMedia]", error.message);
    return [];
  }
  return (data as MediaRow[] | null) ?? [];
}

export async function updateSiteMediaMeta(opts: {
  id: string;
  alt: string;
  tags?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const alt = opts.alt.trim();
  if (!alt) return { ok: false, error: "Alt text is required." };
  const { error } = await supabaseAdmin
    .from(TABLES.SITE_MEDIA)
    .update({ alt, ...(opts.tags ? { tags: opts.tags } : {}) })
    .eq("id", opts.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type UploadSiteMediaResult =
  { ok: true; id: string; path: string; url: string } | { ok: false; error: string };

/**
 * Validate image, convert to WebP via sharp, store under `site/`, insert site_media.
 */
export async function uploadSiteMedia(opts: {
  file: File;
  alt: string;
  tagsRaw?: string;
  uploadedBy: string;
}): Promise<UploadSiteMediaResult> {
  const gate = validateSiteMediaUpload({
    alt: opts.alt,
    mime: opts.file.type,
    size: opts.file.size,
  });
  if (!gate.ok) return gate;
  const alt = gate.alt;

  const tags = parseTags(opts.tagsRaw ?? "");
  const bytes = Buffer.from(await opts.file.arrayBuffer());

  let out: Buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const sharp = (await import("sharp")).default;
    const pipeline = sharp(bytes).rotate().webp({ quality: 82 });
    const meta = await pipeline.metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    out = await pipeline.toBuffer();
  } catch (err) {
    logger.error("[uploadSiteMedia] sharp", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "Could not convert image to WebP." };
  }

  const key = `site/${opts.uploadedBy}/${crypto.randomUUID()}.webp`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .upload(key, out, { contentType: "image/webp", upsert: false });
  if (upErr) {
    logger.error("[uploadSiteMedia] storage", { code: upErr.message });
    return { ok: false, error: "Upload failed." };
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_MEDIA)
    .insert({
      path: key,
      alt,
      tags,
      mime: "image/webp",
      size: out.byteLength,
      width,
      height,
      uploaded_by: opts.uploadedBy,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save media row." };
  }

  const { data: pub } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(key);
  return { ok: true, id: data.id, path: key, url: pub.publicUrl };
}

export function siteMediaPublicUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
