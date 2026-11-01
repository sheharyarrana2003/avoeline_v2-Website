import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export type PlatformAlertKind =
  | "plan_changed"
  | "custom_pricing"
  | "feature_override"
  | "feature_override_cleared"
  | "plan_expiry_reminder"
  | "legal_update";

export type PlatformAlert = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  targetUserId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function createPlatformAlert(input: {
  kind: PlatformAlertKind | string;
  title: string;
  body?: string | null;
  href?: string | null;
  targetUserId?: string | null;
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.PLATFORM_ALERTS)
    .insert({
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      target_user_id: input.targetUserId ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[createPlatformAlert]", error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Unread alerts (read_at is null), newest first. */
export async function listOpenPlatformAlerts(limit = 50): Promise<PlatformAlert[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.PLATFORM_ALERTS)
    .select("id, kind, title, body, href, target_user_id, read_at, created_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listOpenPlatformAlerts]", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    targetUserId: row.target_user_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

/** True if a matching alert was created for this user within `withinDays`. */
export async function hasRecentPlatformAlert(opts: {
  kind: string;
  targetUserId: string;
  withinDays: number;
}): Promise<boolean> {
  const since = new Date(Date.now() - opts.withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLES.PLATFORM_ALERTS)
    .select("id")
    .eq("kind", opts.kind)
    .eq("target_user_id", opts.targetUserId)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[hasRecentPlatformAlert]", error.message);
    return false;
  }
  return Boolean(data?.id);
}
