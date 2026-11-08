import "server-only";

import { createHash } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getCapacity } from "./capacity.service";
import { findActiveEmailConnection, getConnectionById } from "./connections.service";
import { sendAsConnection } from "./sender.service";
import { buildSchedule, isTimeSensitiveKind, nextNineAmLocal } from "../lib/capacityMath";
import type { PreviewSendResult } from "../types";
import { writeConnectionAudit } from "./audit.service";

export type ResolvedRecipient = {
  email: string;
  registrationId?: string | null;
  userId?: string | null;
  name?: string | null;
};

function recipientKey(email: string): string {
  return email.trim().toLowerCase();
}

function idemKey(batchId: string, email: string): string {
  return createHash("sha256")
    .update(`${batchId}:${recipientKey(email)}`)
    .digest("hex");
}

export async function dedupeRecipients24h(
  connectionId: string,
  kind: string,
  recipients: ResolvedRecipient[],
): Promise<ResolvedRecipient[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const emails = recipients.map((r) => recipientKey(r.email));
  if (!emails.length) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .select("recipient")
    .eq("connection_id", connectionId)
    .eq("kind", kind)
    .eq("status", "sent")
    .gte("sent_at", since)
    .in("recipient", emails);
  const sent = new Set((data || []).map((r) => String(r.recipient).toLowerCase()));
  return recipients.filter((r) => !sent.has(recipientKey(r.email)));
}

export async function filterSuppressions(
  ownerId: string,
  recipients: ResolvedRecipient[],
): Promise<ResolvedRecipient[]> {
  const emails = recipients.map((r) => recipientKey(r.email));
  if (!emails.length) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.EMAIL_SUPPRESSIONS)
    .select("email_normalized")
    .eq("owner_id", ownerId)
    .in("email_normalized", emails);
  const blocked = new Set((data || []).map((r) => r.email_normalized));
  return recipients.filter((r) => !blocked.has(recipientKey(r.email)));
}

export async function previewSend(opts: {
  ownerId: string;
  kind: string;
  recipients: ResolvedRecipient[];
  connectionId?: string;
  eventId?: string | null;
  startAt?: Date;
}): Promise<PreviewSendResult> {
  const conn = opts.connectionId
    ? await getConnectionById(opts.connectionId)
    : await findActiveEmailConnection({ ownerType: "user", ownerId: opts.ownerId });
  if (!conn) {
    return {
      total: 0,
      sendNow: 0,
      schedule: [],
      eta: null,
      blockedReason: "Connect Google before sending.",
      capacity: {
        connectionId: "",
        providerEmail: "",
        usedLast24h: 0,
        providerDailyLimit: 400,
        providerRemaining: 0,
        planDailyCap: 0,
        planDailyRemaining: 0,
        planMonthlyCap: 0,
        planMonthlyRemaining: 0,
        maxPerSend: 500,
        reserve: 80,
        remainingNow: 0,
        remainingBulk: 0,
        nextFreeAt: null,
        nextMonthResetAt: new Date().toISOString(),
        timezone: "Asia/Karachi",
        blockedReason: "Connect Google before sending.",
      },
    };
  }

  let recipients = await dedupeRecipients24h(conn.id, opts.kind, opts.recipients);
  if (!isTimeSensitiveKind(opts.kind)) {
    recipients = await filterSuppressions(opts.ownerId, recipients);
  }

  const capacity = await getCapacity({
    connection: conn,
    ownerId: opts.ownerId,
    kind: opts.kind,
    eventId: opts.eventId,
  });

  const totalRaw = recipients.length;
  const capped = Math.min(totalRaw, capacity.maxPerSend);
  const list = recipients.slice(0, capped);
  const total = list.length;

  if (capacity.planMonthlyRemaining <= 0) {
    return {
      total,
      sendNow: 0,
      schedule: [],
      eta: capacity.nextMonthResetAt,
      blockedReason: capacity.blockedReason ?? null,
      capacity,
    };
  }

  const available = isTimeSensitiveKind(opts.kind) ? capacity.remainingNow : capacity.remainingBulk;
  const sendNow = Math.min(total, Math.max(0, available));
  const startAt = opts.startAt || nextNineAmLocal(new Date(), capacity.timezone);
  const { schedule, eta } = buildSchedule({
    total,
    sendNow,
    startAt,
    timeZone: capacity.timezone,
    mode: "send_and_schedule",
    dailyChunk: Math.max(1, available || capacity.maxPerSend),
  });

  return {
    total,
    sendNow,
    schedule,
    eta,
    blockedReason: total === 0 ? "No eligible recipients." : null,
    capacity,
  };
}

export async function enqueueBatch(opts: {
  ownerId: string;
  kind: string;
  subject: string;
  html?: string;
  text?: string;
  recipients: ResolvedRecipient[];
  mode: "send_and_schedule" | "selection_cap" | "spread_days";
  spreadDays?: number;
  startAt?: Date;
  eventId?: string | null;
  connectionId?: string;
  createdBy: string;
  /** Merged into every outbox payload (e.g. certificate includeDriveLink). */
  payloadExtra?: Record<string, unknown>;
  /**
   * Queue the “send now” slice into the outbox instead of syncing HTML.
   * Used for certificate emails so the worker can render at send time (docs/18).
   */
  deferSendNowToOutbox?: boolean;
}): Promise<{ batchId: string; sentNow: number; queued: number }> {
  const preview = await previewSend({
    ownerId: opts.ownerId,
    kind: opts.kind,
    recipients: opts.recipients,
    connectionId: opts.connectionId,
    eventId: opts.eventId,
    startAt: opts.startAt,
  });
  if (!preview.capacity.connectionId) {
    throw new Error(preview.blockedReason || "No connection");
  }
  if (preview.capacity.planMonthlyRemaining <= 0 && opts.mode !== "spread_days") {
    // Allow schedule from month reset for monthly block via spread/startAt
    if (!opts.startAt) {
      throw new Error(preview.blockedReason || "Monthly cap reached");
    }
  }

  let recipients = await dedupeRecipients24h(
    preview.capacity.connectionId,
    opts.kind,
    opts.recipients,
  );
  if (!isTimeSensitiveKind(opts.kind)) {
    recipients = await filterSuppressions(opts.ownerId, recipients);
  }
  recipients = recipients.slice(0, preview.capacity.maxPerSend);

  if (opts.mode === "selection_cap") {
    recipients = recipients.slice(0, preview.sendNow);
  }

  const startAt = opts.startAt || nextNineAmLocal(new Date(), preview.capacity.timezone);
  const available = isTimeSensitiveKind(opts.kind)
    ? preview.capacity.remainingNow
    : preview.capacity.remainingBulk;

  let sendNowCount =
    opts.mode === "selection_cap"
      ? recipients.length
      : opts.mode === "spread_days"
        ? 0
        : Math.min(recipients.length, Math.max(0, available));

  const { schedule } = buildSchedule({
    total: recipients.length,
    sendNow: sendNowCount,
    startAt,
    timeZone: preview.capacity.timezone,
    mode: opts.mode === "spread_days" ? "spread_days" : "send_and_schedule",
    spreadDays: opts.spreadDays,
    dailyChunk: Math.max(1, available || preview.capacity.maxPerSend),
  });

  const timeSensitive = isTimeSensitiveKind(opts.kind);
  const { data: batch, error } = await supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .insert({
      owner_type: "user",
      owner_id: opts.ownerId,
      connection_id: preview.capacity.connectionId,
      kind: opts.kind,
      created_by: opts.createdBy,
      total: recipients.length,
      status: sendNowCount >= recipients.length ? "sending" : "scheduled",
      not_before: schedule[0]?.notBefore || null,
      spread_days: opts.spreadDays ?? null,
      subject: opts.subject.slice(0, 500),
      event_id: opts.eventId || null,
    })
    .select("id")
    .single();
  if (error || !batch) throw error || new Error("Failed to create batch");

  const nowSlice = recipients.slice(0, sendNowCount);
  const rest = recipients.slice(sendNowCount);
  let cursor = 0;
  const outboxRows: Array<Record<string, unknown>> = [];

  const basePayload = (r: ResolvedRecipient) => ({
    to: recipientKey(r.email),
    registrationId: r.registrationId || null,
    userId: r.userId || null,
    subject: opts.subject,
    html: opts.html || null,
    text: opts.text || null,
    kind: opts.kind,
    eventId: opts.eventId || null,
    ...(opts.payloadExtra || {}),
  });

  for (const chunk of schedule) {
    const slice = rest.slice(cursor, cursor + chunk.count);
    cursor += chunk.count;
    for (const r of slice) {
      outboxRows.push({
        connection_id: preview.capacity.connectionId,
        batch_id: batch.id,
        status: "queued",
        paused: false,
        priority: timeSensitive ? 100 : 0,
        time_sensitive: timeSensitive,
        not_before: chunk.notBefore,
        idempotency_key: idemKey(batch.id, r.email),
        payload: basePayload(r),
      });
    }
  }

  const deferNow = Boolean(opts.deferSendNowToOutbox) || opts.kind === "certificate";
  if (deferNow) {
    const nowIso = new Date().toISOString();
    for (const r of nowSlice) {
      outboxRows.push({
        connection_id: preview.capacity.connectionId,
        batch_id: batch.id,
        status: "queued",
        paused: false,
        priority: timeSensitive ? 100 : 0,
        time_sensitive: timeSensitive,
        not_before: nowIso,
        idempotency_key: idemKey(batch.id, r.email),
        payload: basePayload(r),
      });
    }
  }

  if (outboxRows.length) {
    const { error: outErr } = await supabaseAdmin.from(TABLES.EMAIL_OUTBOX).insert(outboxRows);
    if (outErr) throw outErr;
  }

  let sentNow = 0;
  if (!deferNow) {
    for (const r of nowSlice) {
      const key = idemKey(batch.id, r.email);
      const result = await sendAsConnection(
        {
          connectionId: preview.capacity.connectionId,
          to: r.email,
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
          kind: opts.kind,
          idempotencyKey: key,
        },
        opts.createdBy,
      );
      if (result.ok) sentNow += 1;
      else {
        await supabaseAdmin.from(TABLES.EMAIL_OUTBOX).insert({
          connection_id: preview.capacity.connectionId,
          batch_id: batch.id,
          status: "failed",
          paused: false,
          priority: timeSensitive ? 100 : 0,
          time_sensitive: timeSensitive,
          not_before: new Date().toISOString(),
          idempotency_key: key,
          last_error: result.error || "send failed",
          payload: basePayload(r),
        });
      }
    }
  }

  await supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .update({
      sent: sentNow,
      failed: nowSlice.length - sentNow,
      status:
        sentNow >= recipients.length && outboxRows.length === 0
          ? "completed"
          : outboxRows.length
            ? "scheduled"
            : sentNow > 0
              ? "completed"
              : "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  await writeConnectionAudit({
    connectionId: preview.capacity.connectionId,
    ownerType: "user",
    ownerId: opts.ownerId,
    actorId: opts.createdBy,
    action: "batch_enqueue",
    details: {
      batchId: batch.id,
      total: recipients.length,
      sentNow,
      queued: outboxRows.length,
      kind: opts.kind,
    },
  });

  return { batchId: batch.id, sentNow, queued: outboxRows.length };
}

export async function listBatches(opts: {
  ownerId: string;
  cursor?: { createdAt: string; id: string } | null;
  limit?: number;
}) {
  const limit = Math.min(50, Math.max(1, opts.limit || 20));
  let q = supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .select(
      "id, owner_type, owner_id, connection_id, kind, total, sent, failed, skipped, cancelled, status, not_before, spread_days, subject, event_id, created_at, updated_at",
    )
    .eq("owner_type", "user")
    .eq("owner_id", opts.ownerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (opts.cursor) {
    q = q.or(
      `created_at.lt.${opts.cursor.createdAt},and(created_at.eq.${opts.cursor.createdAt},id.lt.${opts.cursor.id})`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && page.length
      ? { createdAt: page[page.length - 1]!.created_at, id: page[page.length - 1]!.id }
      : null;
  return { rows: page, nextCursor };
}

export async function cancelBatchRest(batchId: string, actorId: string): Promise<void> {
  const { data: batch } = await supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .select("id, owner_id, connection_id, cancelled, status")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) throw new Error("Batch not found");

  const { data: cancelledRows } = await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .update({ status: "cancelled", paused: true })
    .eq("batch_id", batchId)
    .eq("status", "queued")
    .select("id");

  const n = cancelledRows?.length || 0;
  await supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .update({
      cancelled: (batch.cancelled || 0) + n,
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  await writeConnectionAudit({
    connectionId: batch.connection_id,
    ownerType: "user",
    ownerId: batch.owner_id,
    actorId,
    action: "batch_cancel",
    details: { batchId, cancelled: n },
  });
}

export async function changeBatchStartTime(
  batchId: string,
  notBefore: Date,
  actorId: string,
): Promise<void> {
  const { data: batch } = await supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .select("id, owner_id, connection_id")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) throw new Error("Batch not found");

  const iso = notBefore.toISOString();
  await supabaseAdmin
    .from(TABLES.EMAIL_SEND_BATCHES)
    .update({ not_before: iso, status: "scheduled", updated_at: new Date().toISOString() })
    .eq("id", batchId);
  await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .update({ not_before: iso, paused: false, status: "queued" })
    .eq("batch_id", batchId)
    .in("status", ["queued", "paused"]);

  await writeConnectionAudit({
    connectionId: batch.connection_id,
    ownerType: "user",
    ownerId: batch.owner_id,
    actorId,
    action: "batch_reschedule",
    details: { batchId, notBefore: iso },
  });
}
