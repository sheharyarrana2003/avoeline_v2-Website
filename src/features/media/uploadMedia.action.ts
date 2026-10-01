"use server";

import { supabaseAdmin, MEDIA_BUCKET, getSignedUrl } from "@/data/supabase";

export type UploadResult =
  | { success: true; url: string; path: string }
  | { success: false; error: string };

const MAX_BYTES = 50 * 1024 * 1024; // keep in step with next.config serverActions.bodySizeLimit

/**
 * Images and video cover banners, galleries and avatars. Documents were added
 * for the things events actually carry alongside a picture: rules and
 * problem-statement files, pitch decks, sponsor agreements.
 *
 * An allowlist, not a blocklist, and deliberately narrow -- no archives and
 * nothing executable. The check is on the browser-declared MIME type, which a
 * determined caller controls, so it is a usability guard rather than a security
 * boundary: everything lands in object storage and is served back as an
 * attachment, never executed.
 */
const ALLOWED_PREFIXES = ["image/", "video/"];
const ALLOWED_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc
    "text/plain",
    "text/csv",
]);

function isAllowedType(mime: string): boolean {
    return ALLOWED_PREFIXES.some((p) => mime.startsWith(p)) || ALLOWED_TYPES.has(mime);
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
}

/**
 * Upload a single file to Supabase Storage.
 * FormData fields: `file` (required), `folder` (required label, e.g. "banners"),
 * optional `bucket` (defaults to the public `media` bucket).
 * Public bucket → returns the permanent public URL; private bucket → returns a signed URL.
 */
export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file");
    const folder = (formData.get("folder") as string) || "misc";
    const bucket = (formData.get("bucket") as string) || MEDIA_BUCKET;

    if (!file || typeof file === "string") {
      return { success: false, error: "No file provided." };
    }
    const f = file as File;

    if (!isAllowedType(f.type)) {
      return { success: false, error: "That file type is not allowed. Use an image, a video, a PDF, or an Office document." };
    }
    if (f.size > MAX_BYTES) {
      return { success: false, error: "File is too large (max 50MB)." };
    }

    const key = `${folder}/${crypto.randomUUID()}-${safeName(f.name)}`;
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, f, { contentType: f.type, upsert: false });

    if (error) {
      console.error("[uploadMedia] upload failed", error);
      return { success: false, error: error.message };
    }

    if (bucket === MEDIA_BUCKET) {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
      return { success: true, url: data.publicUrl, path: key };
    }
    // Private bucket (e.g. certificates): return a signed URL for immediate use.
    const signed = await getSignedUrl(bucket, key);
    return { success: true, url: signed, path: key };
  } catch (err: any) {
    console.error("[uploadMedia]", err);
    return { success: false, error: err?.message ?? "Upload failed." };
  }
}
