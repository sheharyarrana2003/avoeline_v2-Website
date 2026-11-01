"use server";

import {
  supabaseAdmin,
  MEDIA_BUCKET,
  CERTIFICATES_BUCKET,
  PAYMENT_SCREENSHOTS_BUCKET,
  SPONSOR_LOGOS_BUCKET,
  CHALLENGE_FILES_BUCKET,
  PUBLIC_STORAGE_BUCKETS,
  getSignedUrl,
} from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";

export type UploadResult =
  { success: true; url: string; path: string } | { success: false; error: string };

const MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED_BUCKETS = new Set([
  MEDIA_BUCKET,
  CERTIFICATES_BUCKET,
  PAYMENT_SCREENSHOTS_BUCKET,
  SPONSOR_LOGOS_BUCKET,
  CHALLENGE_FILES_BUCKET,
]);

/** Folders clients may request; anything else is rejected. */
const ALLOWED_FOLDERS = new Set([
  "misc",
  "banners",
  "galleries",
  "avatars",
  "logos",
  "covers",
  "portfolio",
  "sponsors",
  "speakers",
  "certificates",
  "payment-proofs",
  "challenges",
  "submissions",
  "documents",
  "site",
]);

const ALLOWED_PREFIXES = ["image/", "video/"];
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/csv",
]);

function isAllowedType(mime: string): boolean {
  return ALLOWED_PREFIXES.some((p) => mime.startsWith(p)) || ALLOWED_TYPES.has(mime);
}

function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "file"
  );
}

function safeFolder(raw: string): string | null {
  const folder = String(raw || "misc")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!folder || !ALLOWED_FOLDERS.has(folder)) return null;
  return folder;
}

/**
 * Upload a single file to Supabase Storage.
 * Requires a signed-in session. Bucket/folder are allowlisted; MIME allowAny is removed.
 */
export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) return { success: false, error: "Sign in to upload." };

    const limited = rateLimit(`upload:${user.userId}`, 30, 60);
    if (!limited.ok) {
      return {
        success: false,
        error: `Too many uploads. Try again in ${limited.retryAfterSec}s.`,
      };
    }

    const file = formData.get("file");
    const folder = safeFolder(String(formData.get("folder") ?? "misc"));
    const bucket = String(formData.get("bucket") || MEDIA_BUCKET).trim();

    if (!file || typeof file === "string") {
      return { success: false, error: "No file provided." };
    }
    if (!folder) return { success: false, error: "That upload folder is not allowed." };
    if (!ALLOWED_BUCKETS.has(bucket))
      return { success: false, error: "That storage bucket is not allowed." };

    const f = file as File;
    if (!isAllowedType(f.type)) {
      return {
        success: false,
        error:
          "That file type is not allowed. Use an image, a video, a PDF, or an Office document.",
      };
    }
    if (f.size > MAX_BYTES) {
      return { success: false, error: "That file is too large (max 50MB)." };
    }

    const key = `${folder}/${user.userId}/${crypto.randomUUID()}-${safeName(f.name)}`;
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, f, { contentType: f.type, upsert: false });

    if (error) {
      logger.error("[uploadMedia] upload failed", { bucket, folder, code: error.message });
      return { success: false, error: "Upload failed." };
    }

    if (PUBLIC_STORAGE_BUCKETS.has(bucket)) {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
      return { success: true, url: data.publicUrl, path: key };
    }
    const signed = await getSignedUrl(bucket, key);
    return { success: true, url: signed, path: key };
  } catch (err: unknown) {
    logger.error("[uploadMedia]", { err: err instanceof Error ? err.message : "unknown" });
    return { success: false, error: "Upload failed." };
  }
}
