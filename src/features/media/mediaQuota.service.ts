import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { DEFAULT_MEDIA_QUOTA_BYTES } from "@/src/features/files/uploadKinds";
import { logger } from "@/src/lib/logger";

type UsageProfile = { plan_type?: string | null; media_bytes_used?: number | null };

/**
 * Soft per-organizer public media quota (docs/23 A8).
 * `media_bytes_used` from migration 20261109120000.
 */
export async function assertMediaQuota(opts: {
  organizerId: string;
  addBytes: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: profile, error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("*")
    .eq("user_id", opts.organizerId)
    .maybeSingle();

  if (error) {
    logger.error("[assertMediaQuota]", { code: error.code });
    return { ok: true }; // fail open if profile unreadable — upload still gated by auth
  }

  const row = profile as UsageProfile | null;
  const planKey = String(row?.plan_type || "free").toLowerCase();
  const quota =
    DEFAULT_MEDIA_QUOTA_BYTES[planKey] ?? DEFAULT_MEDIA_QUOTA_BYTES.free ?? 200 * 1024 * 1024;
  const used = Number(row?.media_bytes_used || 0);

  if (used + opts.addBytes > quota) {
    return {
      ok: false,
      error: "Your plan's media storage is full. Remove unused images or upgrade your plan.",
    };
  }
  return { ok: true };
}

export async function recordMediaUsage(opts: {
  organizerId: string;
  addBytes: number;
}): Promise<void> {
  try {
    const { data: profile } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("*")
      .eq("user_id", opts.organizerId)
      .maybeSingle();
    if (!profile) return;
    const used = Number((profile as UsageProfile).media_bytes_used || 0);
    const { error } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .update({ media_bytes_used: used + opts.addBytes } as never)
      .eq("user_id", opts.organizerId);
    if (error) logger.error("[recordMediaUsage]", { code: error.code });
  } catch (err) {
    logger.error("[recordMediaUsage]", { err: err instanceof Error ? err.message : "unknown" });
  }
}
