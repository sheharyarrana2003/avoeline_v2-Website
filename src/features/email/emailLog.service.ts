import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import {
  DEFAULT_PLATFORM_EMAIL_DAILY_CAP,
  DEFAULT_PLATFORM_EMAIL_ESSENTIAL_RESERVE,
  ESSENTIAL_EMAIL_KINDS,
  KIND_LANE,
  type PlatformEmailKind,
  coalesceWindowMs,
} from "@/src/lib/email/kinds";
import { sendPlatformEmail, type ResendSendResult } from "@/src/lib/email/resend";
import { logger } from "@/src/lib/logger";
import type { ReactElement } from "react";

export type EmailLogStatus = "not_sent" | "queued" | "sent" | "delivered" | "bounced" | "failed";

export type EmailLogRow = {
  id: string;
  kind: string;
  lane: string;
  recipient: string;
  userId: string | null;
  subject: string;
  status: EmailLogStatus;
  providerId: string | null;
  error: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  batchKey: string | null;
  createdAt: string;
  sentAt: string | null;
};

function dailyCap(): number {
  const n = Number(process.env.PLATFORM_EMAIL_DAILY_CAP || DEFAULT_PLATFORM_EMAIL_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_PLATFORM_EMAIL_DAILY_CAP;
}

function essentialReserve(): number {
  const n = Number(
    process.env.PLATFORM_EMAIL_ESSENTIAL_RESERVE || DEFAULT_PLATFORM_EMAIL_ESSENTIAL_RESERVE,
  );
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_PLATFORM_EMAIL_ESSENTIAL_RESERVE;
}

async function sentTodayCount(): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", start.toISOString());
  if (error) {
    logger.warn("[emailLog] sentTodayCount failed", { err: error.message });
    return 0;
  }
  return count ?? 0;
}

/** Whether this kind may send now (essential always; others respect reserve). */
export async function canSendKindNow(kind: PlatformEmailKind): Promise<boolean> {
  if (ESSENTIAL_EMAIL_KINDS.has(kind)) return true;
  const used = await sentTodayCount();
  const remaining = dailyCap() - used;
  return remaining > essentialReserve();
}

function mapRow(raw: Record<string, unknown>): EmailLogRow {
  const status = String(raw.status || "queued") as EmailLogStatus;
  return {
    id: String(raw.id),
    kind: String(raw.kind || ""),
    lane: String(raw.lane || ""),
    recipient: String(raw.recipient || ""),
    userId: raw.user_id ? String(raw.user_id) : null,
    subject: String(raw.subject || ""),
    status: (["not_sent", "queued", "sent", "delivered", "bounced", "failed"] as string[]).includes(
      status,
    )
      ? status
      : "queued",
    providerId: raw.provider_id ? String(raw.provider_id) : null,
    error: raw.error ? String(raw.error) : null,
    payload:
      raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
        ? (raw.payload as Record<string, unknown>)
        : {},
    idempotencyKey: raw.idempotency_key ? String(raw.idempotency_key) : null,
    batchKey: raw.batch_key ? String(raw.batch_key) : null,
    createdAt: String(raw.created_at || ""),
    sentAt: raw.sent_at ? String(raw.sent_at) : null,
  };
}

export async function insertEmailLog(input: {
  kind: PlatformEmailKind;
  recipient: string;
  userId?: string | null;
  subject: string;
  status: EmailLogStatus;
  providerId?: string | null;
  error?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
  batchKey?: string | null;
  sentAt?: string | null;
}): Promise<EmailLogRow | null> {
  const lane = KIND_LANE[input.kind];
  const { data, error } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .insert({
      kind: input.kind,
      lane,
      recipient: input.recipient.trim().toLowerCase(),
      user_id: input.userId || null,
      subject: input.subject.slice(0, 500),
      status: input.status,
      provider_id: input.providerId || null,
      error: input.error ? String(input.error).slice(0, 2000) : null,
      payload: (input.payload || {}) as Record<string, unknown>,
      idempotency_key: input.idempotencyKey || null,
      batch_key: input.batchKey || null,
      sent_at: input.sentAt || null,
    })
    .select("*")
    .maybeSingle();
  if (error) {
    logger.error("[emailLog] insert failed", { err: error.message, kind: input.kind });
    return null;
  }
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function updateEmailLogStatus(
  id: string,
  patch: {
    status: EmailLogStatus;
    providerId?: string | null;
    error?: string | null;
    sentAt?: string | null;
  },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .update({
      status: patch.status,
      provider_id: patch.providerId ?? undefined,
      error: patch.error ?? undefined,
      sent_at: patch.sentAt ?? undefined,
    })
    .eq("id", id);
  if (error) logger.warn("[emailLog] update failed", { err: error.message, id });
}

/**
 * Send (or queue) an allowlisted platform email and always record email_log.
 * Never throws — callers must not roll back domain writes on mail failure.
 */
export async function sendLoggedPlatformEmail(input: {
  kind: PlatformEmailKind;
  to: string;
  userId?: string | null;
  subject: string;
  react?: ReactElement;
  text?: string;
  /** Safe summary for Activity; never include passwords or internal notes. */
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  batchKey?: string;
  /** When false, only log not_sent (admin opted out of email). */
  send?: boolean;
}): Promise<{ logId: string | null; result: ResendSendResult }> {
  const to = input.to.trim().toLowerCase();
  const send = input.send !== false;

  if (!send) {
    const row = await insertEmailLog({
      kind: input.kind,
      recipient: to,
      userId: input.userId,
      subject: input.subject,
      status: "not_sent",
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      batchKey: input.batchKey,
    });
    return { logId: row?.id ?? null, result: { ok: true, dryRun: true } };
  }

  const maySend = await canSendKindNow(input.kind);
  if (!maySend) {
    const row = await insertEmailLog({
      kind: input.kind,
      recipient: to,
      userId: input.userId,
      subject: input.subject,
      status: "queued",
      payload: { ...(input.payload || {}), queuedReason: "daily_cap_reserve" },
      idempotencyKey: input.idempotencyKey,
      batchKey: input.batchKey,
    });
    return { logId: row?.id ?? null, result: { ok: false, error: "queued_for_cap" } };
  }

  const result = await sendPlatformEmail({
    lane: KIND_LANE[input.kind],
    to,
    subject: input.subject,
    react: input.react,
    text: input.text,
  });

  const row = await insertEmailLog({
    kind: input.kind,
    recipient: to,
    userId: input.userId,
    subject: input.subject,
    status: result.ok ? "sent" : "failed",
    providerId: result.id || null,
    error: result.ok ? null : result.error || "send_failed",
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
    batchKey: input.batchKey,
    sentAt: result.ok ? new Date().toISOString() : null,
  });

  return { logId: row?.id ?? null, result };
}

/**
 * Find an open coalesce batch for the same tenant+kind within the 10-minute window.
 * Returns existing queued row id to append into, or null to start a new batch.
 */
export async function findOpenCoalesceBatch(input: {
  kind: PlatformEmailKind;
  userId: string;
}): Promise<{ id: string; batchKey: string; payload: Record<string, unknown> } | null> {
  const since = new Date(Date.now() - coalesceWindowMs()).toISOString();
  const { data } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("id, batch_key, payload, created_at")
    .eq("kind", input.kind)
    .eq("user_id", input.userId)
    .eq("status", "queued")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.id || !data.batch_key) return null;
  return {
    id: String(data.id),
    batchKey: String(data.batch_key),
    payload:
      data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
        ? (data.payload as Record<string, unknown>)
        : {},
  };
}

export async function appendCoalescePayload(logId: string, changes: unknown[]): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("payload")
    .eq("id", logId)
    .maybeSingle();
  const prev =
    data?.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : {};
  const list = Array.isArray(prev.changes) ? [...(prev.changes as unknown[])] : [];
  list.push(...changes);
  await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .update({ payload: { ...prev, changes: list } })
    .eq("id", logId);
}

export async function listEmailLogPage(input?: {
  cursor?: string | null;
  limit?: number;
  status?: EmailLogStatus | null;
  q?: string | null;
}): Promise<{ rows: EmailLogRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(input?.limit ?? 25, 1), 50);
  let q = supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (input?.cursor) q = q.lt("created_at", input.cursor);
  if (input?.status) q = q.eq("status", input.status);
  if (input?.q?.trim()) {
    const term = `%${input.q.trim()}%`;
    q = q.or(`recipient.ilike.${term},subject.ilike.${term}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    rows: page,
    nextCursor: hasMore ? (page[page.length - 1]?.createdAt ?? null) : null,
  };
}

export { sanitizeEmailPayload } from "@/src/lib/email/sanitizePayload";
