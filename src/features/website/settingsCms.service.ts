import "server-only";

import { revalidateTag } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { Database, Json } from "@/src/lib/database.types";
import { SITE_ALL, SITE_NAV, SITE_PLANS, SITE_SETTINGS, SITE_STATS } from "./cacheTags";

type PlanRow = Database["public"]["Tables"]["subscription_plans"]["Row"];
type StatsRow = Database["public"]["Tables"]["site_stats_settings"]["Row"];

export async function upsertSiteSetting(
  key: string,
  value: Json,
  adminId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from(TABLES.SITE_SETTINGS).upsert({
    key,
    value,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_SETTINGS, "max");
  revalidateTag(SITE_NAV, "max");
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}

export async function listSiteSettings(keys: string[]): Promise<Record<string, Json>> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_SETTINGS)
    .select("key, value")
    .in("key", keys);
  if (error) {
    console.error("[listSiteSettings]", error.message);
    return {};
  }
  const out: Record<string, Json> = {};
  for (const row of data ?? []) {
    out[row.key] = row.value as Json;
  }
  return out;
}

/** Display-only plan fields — never prices or modules. */
export type PlanDisplayPatch = {
  id: string;
  is_public?: boolean;
  is_recommended?: boolean;
  badge_text?: string | null;
  tagline?: string | null;
  highlight_features?: string[];
  cta_label?: string | null;
  cta_href?: string | null;
  sort_order?: number;
};

export async function updatePlanDisplay(
  patch: PlanDisplayPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { id, ...rest } = patch;
  const { error } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_PLANS, "max");
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}

export async function listPlansForDisplay(): Promise<PlanRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[listPlansForDisplay]", error.message);
    return [];
  }
  return (data as PlanRow[] | null) ?? [];
}

export async function listStatsSettings(): Promise<StatsRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_STATS_SETTINGS)
    .select("*")
    .order("key", { ascending: true });
  if (error) {
    console.error("[listStatsSettings]", error.message);
    return [];
  }
  return (data as StatsRow[] | null) ?? [];
}

export async function updateStatsSetting(
  row: Pick<StatsRow, "key" | "label" | "visible" | "min_threshold" | "format">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from(TABLES.SITE_STATS_SETTINGS).upsert(row);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_STATS, "max");
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}
