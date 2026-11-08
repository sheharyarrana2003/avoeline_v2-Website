import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseAdmin, FILE_FALLBACK_BUCKET } from "@/data/supabase";
import { logger } from "@/src/lib/logger";

/** Default TTL for fallback objects (7 days). */
export const FALLBACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Soft quota per organizer for fallback storage (100 MB). */
export const FALLBACK_QUOTA_BYTES = 100 * 1024 * 1024;

export type SupabasePutOpts = {
  organizerId: string;
  eventId: string;
  category: string;
  name: string;
  mime: string;
  bytes: Buffer | Uint8Array;
  expiresAt?: Date;
};

export type SupabasePutResult = {
  objectKey: string;
  expiresAt: string;
  size: number;
};

export async function supabasePut(opts: SupabasePutOpts): Promise<SupabasePutResult> {
  const expires = opts.expiresAt || new Date(Date.now() + FALLBACK_TTL_MS);
  const safeName = opts.name.replace(/[\\/]/g, "-").slice(0, 120) || "file";
  const objectKey = [
    opts.organizerId,
    opts.eventId,
    opts.category,
    `${randomUUID()}-${safeName}`,
  ].join("/");

  const body = Buffer.isBuffer(opts.bytes) ? opts.bytes : Buffer.from(opts.bytes);
  const { error } = await supabaseAdmin.storage.from(FILE_FALLBACK_BUCKET).upload(objectKey, body, {
    contentType: opts.mime || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    logger.error("[SupabaseStore.put]", { err: error.message, objectKey });
    throw new Error(error.message || "Fallback storage upload failed.");
  }

  return {
    objectKey,
    expiresAt: expires.toISOString(),
    size: body.length,
  };
}

export async function supabaseDownload(objectKey: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from(FILE_FALLBACK_BUCKET)
    .download(objectKey);
  if (error || !data) {
    throw new Error(error?.message || "Fallback file not found.");
  }
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

export async function supabaseDelete(objectKey: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(FILE_FALLBACK_BUCKET).remove([objectKey]);
  if (error) {
    logger.error("[SupabaseStore.delete]", { err: error.message, objectKey });
    throw new Error(error.message);
  }
}
