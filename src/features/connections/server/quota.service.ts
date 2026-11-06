import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { ConnectionCapability } from "../types";

const DEFAULT_DAILY = 400;
const DEFAULT_PER_MINUTE = 30;

export async function getDailyLimit(
  connectionId: string,
  capability: ConnectionCapability,
): Promise<number> {
  const { data } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("settings")
    .eq("connection_id", connectionId)
    .eq("capability", capability)
    .maybeSingle();
  const settings = (data?.settings || {}) as { daily_limit?: number };
  return typeof settings.daily_limit === "number" && settings.daily_limit > 0
    ? settings.daily_limit
    : DEFAULT_DAILY;
}

export async function getUsageCount(
  connectionId: string,
  capability: ConnectionCapability,
  usageDate = new Date().toISOString().slice(0, 10),
): Promise<number> {
  const { data } = await supabaseAdmin
    .from(TABLES.CONNECTION_USAGE)
    .select("count")
    .eq("connection_id", connectionId)
    .eq("capability", capability)
    .eq("usage_date", usageDate)
    .maybeSingle();
  return data?.count ?? 0;
}

export async function remainingDailyQuota(
  connectionId: string,
  capability: ConnectionCapability = "email.send",
): Promise<number> {
  const [limit, used] = await Promise.all([
    getDailyLimit(connectionId, capability),
    getUsageCount(connectionId, capability),
  ]);
  return Math.max(0, limit - used);
}

export async function assertWithinQuota(
  connectionId: string,
  capability: ConnectionCapability,
  amount = 1,
): Promise<{ ok: true } | { ok: false; remaining: number; limit: number }> {
  const limit = await getDailyLimit(connectionId, capability);
  const used = await getUsageCount(connectionId, capability);
  if (used + amount > limit) {
    return { ok: false, remaining: Math.max(0, limit - used), limit };
  }
  return { ok: true };
}

export async function recordUsage(
  connectionId: string,
  capability: ConnectionCapability,
  amount = 1,
): Promise<void> {
  const usageDate = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from(TABLES.CONNECTION_USAGE)
    .select("count")
    .eq("connection_id", connectionId)
    .eq("capability", capability)
    .eq("usage_date", usageDate)
    .maybeSingle();
  if (data) {
    await supabaseAdmin
      .from(TABLES.CONNECTION_USAGE)
      .update({ count: (data.count || 0) + amount })
      .eq("connection_id", connectionId)
      .eq("capability", capability)
      .eq("usage_date", usageDate);
  } else {
    await supabaseAdmin.from(TABLES.CONNECTION_USAGE).insert({
      connection_id: connectionId,
      capability,
      usage_date: usageDate,
      count: amount,
    });
  }
}

export { DEFAULT_DAILY, DEFAULT_PER_MINUTE };
