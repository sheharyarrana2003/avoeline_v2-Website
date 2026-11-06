import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getConnectionById } from "./connections.service";
import {
  computeReserve,
  DEFAULT_TZ,
  isTimeSensitiveKind,
  nextFreeAtFromTimestamps,
  nextMonthStartInTz,
  remainingBulkOf,
  remainingNowOf,
  startOfMonthInTz,
} from "../lib/capacityMath";
import type { CapacitySnapshot, ConnectionPublic } from "../types";

export async function resolveOrganizerTimezone(
  ownerId: string,
  eventId?: string | null,
): Promise<string> {
  if (eventId) {
    const { data: event } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("timezone")
      .eq("id", eventId)
      .maybeSingle();
    if (event?.timezone?.trim()) return event.timezone.trim();
  }
  const { data: profile } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("timezone")
    .eq("user_id", ownerId)
    .maybeSingle();
  return profile?.timezone?.trim() || DEFAULT_TZ;
}

async function resolvePlanLimits(ownerId: string): Promise<{
  dailyCap: number;
  monthlyCap: number;
  maxPerSend: number;
}> {
  const { data: profile } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("plan_type")
    .eq("user_id", ownerId)
    .maybeSingle();
  const planKey = profile?.plan_type || "free";

  const { data: planLimits } = await supabaseAdmin
    .from(TABLES.PLAN_EMAIL_LIMITS)
    .select("daily_cap, monthly_cap, max_per_send")
    .eq("plan_key", planKey)
    .maybeSingle();

  let dailyCap = planLimits?.daily_cap ?? (planKey === "free" ? 200 : 1500);
  let monthlyCap = planLimits?.monthly_cap ?? (planKey === "free" ? 1000 : 10000);
  let maxPerSend = planLimits?.max_per_send ?? (planKey === "free" ? 100 : 500);

  const nowIso = new Date().toISOString();
  const { data: override } = await supabaseAdmin
    .from(TABLES.EMAIL_LIMIT_OVERRIDES)
    .select("daily_cap, monthly_cap, max_per_send, expires_at")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (override && (!override.expires_at || override.expires_at > nowIso)) {
    if (typeof override.daily_cap === "number") dailyCap = override.daily_cap;
    if (typeof override.monthly_cap === "number") monthlyCap = override.monthly_cap;
    if (typeof override.max_per_send === "number") maxPerSend = override.max_per_send;
  }

  return { dailyCap, monthlyCap, maxPerSend };
}

export async function usedLast24h(
  connectionId: string,
  now = new Date(),
): Promise<{
  count: number;
  sentAts: string[];
}> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("sent_at")
    .eq("connection_id", connectionId)
    .eq("status", "sent")
    .gte("sent_at", since)
    .order("sent_at", { ascending: true });
  if (error) throw error;
  const sentAts = (data || []).map((r) => r.sent_at).filter(Boolean) as string[];
  return { count: sentAts.length, sentAts };
}

export async function usedThisMonth(
  connectionId: string,
  ownerId: string,
  timeZone: string,
  now = new Date(),
): Promise<number> {
  const start = startOfMonthInTz(now, timeZone).toISOString();
  // Shared pool: count by connection_id (org connections share one pool)
  const { count, error } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("id", { count: "exact", head: true })
    .eq("connection_id", connectionId)
    .eq("status", "sent")
    .gte("sent_at", start);
  if (error) throw error;
  void ownerId;
  return count ?? 0;
}

export async function getCapacity(opts: {
  connection: ConnectionPublic | string;
  ownerId: string;
  kind: string;
  eventId?: string | null;
  now?: Date;
}): Promise<CapacitySnapshot> {
  const now = opts.now || new Date();
  const conn =
    typeof opts.connection === "string"
      ? await getConnectionById(opts.connection)
      : opts.connection;
  if (!conn) {
    throw new Error("Connection not found");
  }

  const timeZone = await resolveOrganizerTimezone(opts.ownerId, opts.eventId);
  const providerDailyLimit = conn.dailyLimit || (conn.isWorkspace ? 1500 : 400);
  const { count: used24, sentAts } = await usedLast24h(conn.id, now);
  const providerRemaining = Math.max(0, providerDailyLimit - used24);

  const plans = await resolvePlanLimits(opts.ownerId);
  const monthUsed = await usedThisMonth(conn.id, opts.ownerId, timeZone, now);
  // Plan daily: approximate with rolling window count (same as provider window for fairness)
  const planDailyRemaining = Math.max(0, plans.dailyCap - used24);
  const planMonthlyRemaining = Math.max(0, plans.monthlyCap - monthUsed);

  const remainingNow = remainingNowOf({
    providerRemaining,
    planDailyRemaining,
    planMonthlyRemaining,
  });
  const reserve = computeReserve(providerDailyLimit);
  const timeSensitive = isTimeSensitiveKind(opts.kind);
  const remainingBulk = remainingBulkOf(remainingNow, reserve, timeSensitive);

  let blockedReason: string | null = null;
  if (conn.sendingPausedUntil && new Date(conn.sendingPausedUntil).getTime() > now.getTime()) {
    blockedReason = conn.sendingPausedUntil
      ? `Sending paused until ${conn.sendingPausedUntil}.`
      : "Sending paused.";
  } else if (
    conn.quotaExhaustedUntil &&
    new Date(conn.quotaExhaustedUntil).getTime() > now.getTime()
  ) {
    blockedReason = `Google quota exhausted until ${new Date(conn.quotaExhaustedUntil).toLocaleString()}.`;
  } else if (planMonthlyRemaining <= 0) {
    blockedReason = `Your plan allows ${plans.monthlyCap} emails a month; it resets on ${nextMonthStartInTz(now, timeZone).toLocaleDateString()}.`;
  } else if (remainingNow <= 0) {
    blockedReason = "No send capacity remaining right now.";
  }

  return {
    connectionId: conn.id,
    providerEmail: conn.providerEmail,
    usedLast24h: used24,
    providerDailyLimit,
    providerRemaining,
    planDailyCap: plans.dailyCap,
    planDailyRemaining,
    planMonthlyCap: plans.monthlyCap,
    planMonthlyRemaining,
    maxPerSend: plans.maxPerSend,
    reserve,
    remainingNow,
    remainingBulk: timeSensitive ? remainingNow : remainingBulk,
    nextFreeAt: nextFreeAtFromTimestamps(sentAts, providerDailyLimit, now.getTime()),
    nextMonthResetAt: nextMonthStartInTz(now, timeZone).toISOString(),
    timezone: timeZone,
    blockedReason,
  };
}

export async function countDelayedConfirmations(ownerId: string): Promise<number> {
  const { data: conns } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("owner_type", "user")
    .eq("owner_id", ownerId)
    .eq("status", "active");
  const ids = (conns || []).map((c) => c.id);
  if (!ids.length) return 0;
  const { count } = await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .select("id", { count: "exact", head: true })
    .in("connection_id", ids)
    .eq("time_sensitive", true)
    .eq("status", "queued");
  return count ?? 0;
}
