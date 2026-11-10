"use server";

import { z } from "zod";
import {
  supabaseAdmin,
  MEDIA_BUCKET,
  SPONSOR_LOGOS_BUCKET,
  PUBLIC_STORAGE_BUCKETS,
  getSignedUrl,
} from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import {
  getUploadKindConfig,
  isUploadKind,
  pathForUploadKind,
  type UploadKind,
} from "@/src/features/files/uploadKinds";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import { processPublicDisplayImage } from "./publicMediaProcess";
import { assertMediaQuota, recordMediaUsage } from "./mediaQuota.service";

export type UploadResult =
  { success: true; url: string; path: string } | { success: false; error: string };

function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "file"
  );
}

const inputMeta = z.object({
  kind: z.string().min(1),
  eventId: z.string().uuid().optional().nullable(),
});

/**
 * Organizer upload for typed UploadKind → Supabase public media (docs/23 A8).
 * Requires session. Private FileStore kinds are rejected here (use proof/session routes).
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
    if (!file || typeof file === "string") {
      return { success: false, error: "No file provided." };
    }

    // Prefer typed kind; accept legacy folder→kind aliases for one release.
    const rawKind =
      String(formData.get("kind") || "").trim() ||
      legacyFolderToKind(String(formData.get("folder") || "").trim());
    const parsedMeta = inputMeta.safeParse({
      kind: rawKind,
      eventId: String(formData.get("eventId") || "").trim() || null,
    });
    if (!parsedMeta.success || !isUploadKind(parsedMeta.data.kind)) {
      return { success: false, error: "That upload type is not allowed." };
    }
    const kind = parsedMeta.data.kind as UploadKind;
    const cfg = getUploadKindConfig(kind);

    if (cfg.store !== "supabase_public") {
      return {
        success: false,
        error: "That file type must be uploaded through the secure file store.",
      };
    }
    if (!cfg.who.includes("organizer")) {
      return { success: false, error: "You cannot upload that file type here." };
    }

    const eventId = parsedMeta.data.eventId || null;
    let organizerId = user.userId;
    if (eventId) {
      const event = await assertOwnedEvent(eventId);
      if (!event) return { success: false, error: "You cannot upload media for that event." };
      organizerId = event.organizerId;
    }

    const f = file as File;
    const bytes = Buffer.from(await f.arrayBuffer());
    const processed = await processPublicDisplayImage({
      kind,
      bytes,
      fileName: f.name || "image",
      declaredMime: f.type || "image/jpeg",
    });
    if (!processed.ok) return { success: false, error: processed.error };

    const quota = await assertMediaQuota({
      organizerId,
      addBytes: processed.bytes.length,
    });
    if (!quota.ok) return { success: false, error: quota.error };

    const bucket = cfg.bucket === "sponsor-logos" ? SPONSOR_LOGOS_BUCKET : MEDIA_BUCKET;
    const key = pathForUploadKind({
      kind,
      ownerId: organizerId,
      eventId,
      fileId: crypto.randomUUID(),
      safeName: safeName(processed.name),
    });

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, processed.bytes, { contentType: processed.mime, upsert: false });

    if (error) {
      logger.error("[uploadMedia] upload failed", { bucket, kind, code: error.message });
      return { success: false, error: "Upload failed. Please try again." };
    }

    await recordMediaUsage({ organizerId, addBytes: processed.bytes.length });

    if (PUBLIC_STORAGE_BUCKETS.has(bucket)) {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
      return { success: true, url: data.publicUrl, path: key };
    }
    const signed = await getSignedUrl(bucket, key);
    return { success: true, url: signed, path: key };
  } catch (err: unknown) {
    logger.error("[uploadMedia]", { err: err instanceof Error ? err.message : "unknown" });
    return { success: false, error: "Upload failed. Please try again." };
  }
}

/** Map old free-form folder strings → UploadKind (call sites migrating off folders). */
function legacyFolderToKind(folder: string): string {
  const f = folder.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  switch (f) {
    case "banners":
    case "banner":
      return "event_banner";
    case "galleries":
    case "gallery":
      return "event_gallery";
    case "sponsors":
    case "sponsor-logos":
      return "sponsor_logo";
    case "collaborators":
      return "collaborator_logo";
    case "partners":
      return "partner_logo";
    case "speakers":
    case "speaker-avatars":
      return "speaker_photo";
    case "tracks":
    case "track-images":
    case "track-instructions":
    case "competitions":
      return "competition_image";
    case "certificates":
      return "certificate_asset";
    case "organizer-logos":
    case "vendor-logos":
    case "vendor-covers":
    case "vendor-portfolio":
    case "service-images":
    case "avatars":
    case "logos":
    case "covers":
    case "portfolio":
    case "site":
    case "misc":
      // Non-event public media: reuse competition_image pipeline (image → WebP + quota).
      return "competition_image";
    default:
      // UUID-as-folder (old sponsor form) → sponsor_logo
      if (/^[0-9a-f-]{36}$/i.test(f)) return "sponsor_logo";
      return f;
  }
}
