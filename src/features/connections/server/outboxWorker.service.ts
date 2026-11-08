import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getCapacity } from "./capacity.service";
import { getConnectionById } from "./connections.service";
import { sendAsConnection } from "./sender.service";
import { writeConnectionAudit } from "./audit.service";
import { DEFAULT_PER_MINUTE, isTimeSensitiveKind } from "../lib/capacityMath";
import { logger } from "@/src/lib/logger";
import { mapGoogleApiError } from "../providers/google/errors";

type OutboxRow = {
  id: string;
  connection_id: string | null;
  batch_id: string | null;
  status: string;
  paused: boolean;
  priority: number;
  time_sensitive: boolean;
  not_before: string | null;
  idempotency_key: string | null;
  attempt_count: number;
  payload: Record<string, unknown> | null;
};

function jitterMs(): number {
  return Math.floor(Math.random() * 400);
}

/** Docs/18 send-time render for certificate emails (O7). */
async function renderCertificateOutboxPayload(
  payload: Record<string, unknown>,
): Promise<
  | { ok: true; subject: string; html: string; text: string; certificateId: string }
  | { ok: false; reason: string }
> {
  const registrationId = payload.registrationId ? String(payload.registrationId) : "";
  const eventId = payload.eventId ? String(payload.eventId) : "";
  if (!registrationId || !eventId) return { ok: false, reason: "certificate_missing_ids" };

  const { getCertsOfEventByRegistration, markCertificatesEmailed } =
    await import("@/src/features/certificates/certificates.service");
  const byReg = await getCertsOfEventByRegistration(eventId);
  const cert = byReg.get(registrationId);
  if (!cert || cert.status === "revoked") return { ok: false, reason: "certificate_missing" };

  const includeDriveLink = payload.includeDriveLink === true;
  let driveShareUrl: string | null = cert.driveShareUrl;
  if (includeDriveLink) {
    const { ensureCertificateShared } =
      await import("@/src/features/certificates/certificateJobs.service");
    driveShareUrl = await ensureCertificateShared(cert.id, eventId).catch(() => cert.driveShareUrl);
  }

  const { absoluteUrl } = await import("@/src/lib/appUrl");
  const viewerUrl = await absoluteUrl(`/certificate/${cert.verificationCode}`);
  const verifyUrl = await absoluteUrl(`/verify/${cert.verificationCode}`);
  const { buildCertificateEmail } = await import("@/src/features/certificates/certificateEmail");
  const built = buildCertificateEmail(cert, verifyUrl, viewerUrl, {
    includeDriveLink,
    driveShareUrl,
  });

  // Stamp after successful send — caller marks when send ok; keep id for that.
  void markCertificatesEmailed;
  return {
    ok: true,
    subject: built.subject,
    html: built.html,
    text: built.text,
    certificateId: cert.id,
  };
}

async function revalidateRecipient(payload: Record<string, unknown>): Promise<string | null> {
  const registrationId = payload.registrationId ? String(payload.registrationId) : null;
  const eventId = payload.eventId ? String(payload.eventId) : null;
  const kind = String(payload.kind || "custom");
  const to = String(payload.to || "").toLowerCase();

  if (!to) return "missing_recipient";

  if (registrationId) {
    const { data: reg } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("id, status, attendee")
      .eq("id", registrationId)
      .maybeSingle();
    if (!reg) return "registration_missing";
    if (String(reg.status) === "cancelled") return "registration_cancelled";
  }

  if (isTimeSensitiveKind(kind) && eventId) {
    const { data: event } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, status, schedule")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) return "event_missing";
    if (String(event.status) === "cancelled" || String(event.status) === "archived") {
      return "event_ended";
    }
    const schedule = event.schedule as { endDate?: string; end_date?: string } | null;
    const endAt = schedule?.endDate || schedule?.end_date;
    if (endAt && new Date(endAt).getTime() < Date.now()) return "event_ended";
  }

  if (!isTimeSensitiveKind(kind)) {
    const { data: ownerConn } = await supabaseAdmin
      .from(TABLES.INTEGRATION_CONNECTIONS)
      .select("owner_id")
      .eq("id", String(payload.connectionId || ""))
      .maybeSingle();
    const ownerId = ownerConn?.owner_id;
    if (ownerId) {
      const { data: suppressed } = await supabaseAdmin
        .from(TABLES.EMAIL_SUPPRESSIONS)
        .select("id")
        .eq("owner_id", ownerId)
        .eq("email_normalized", to)
        .maybeSingle();
      if (suppressed) return "unsubscribed";
    }
  }

  return null;
}

export async function applyCircuitBreaker(opts: {
  connectionId: string;
  ownerId: string;
  message: string;
}): Promise<void> {
  const { data: conn } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("quota_exhausted_until")
    .eq("id", opts.connectionId)
    .maybeSingle();

  const prev = conn?.quota_exhausted_until
    ? new Date(conn.quota_exhausted_until).getTime()
    : Date.now();
  const base = Math.max(prev, Date.now());
  const backoffMs = Math.min(
    24 * 60 * 60 * 1000,
    Math.max(15 * 60 * 1000, (base - Date.now()) * 2 || 15 * 60 * 1000),
  );
  const until = new Date(Date.now() + backoffMs).toISOString();

  await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .update({ quota_exhausted_until: until, last_error: opts.message.slice(0, 500) })
    .eq("id", opts.connectionId);

  await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .update({
      not_before: until,
      status: "queued",
      last_error: opts.message.slice(0, 500),
    })
    .eq("connection_id", opts.connectionId)
    .eq("status", "queued");

  // Notify once per exhaustion window via platform alerts pattern
  const { data: recent } = await supabaseAdmin
    .from(TABLES.CONNECTION_AUDIT)
    .select("id")
    .eq("connection_id", opts.connectionId)
    .eq("action", "circuit_breaker")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(1);
  if (!recent?.length) {
    await writeConnectionAudit({
      connectionId: opts.connectionId,
      ownerType: "user",
      ownerId: opts.ownerId,
      action: "circuit_breaker",
      details: { until, message: opts.message.slice(0, 200) },
    });
    try {
      const { createPlatformAlert } = await import("@/src/features/admin/platformAlerts.service");
      await createPlatformAlert({
        kind: "email_quota_exhausted",
        targetUserId: opts.ownerId,
        title: "Email sending paused",
        body: `Google rate/daily limit hit. Sending resumes around ${until}.`,
      });
    } catch {
      // optional
    }
  }
}

export async function processEmailOutbox(limit = 40): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const now = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .select(
      "id, connection_id, batch_id, status, paused, priority, time_sensitive, not_before, idempotency_key, attempt_count, payload",
    )
    .eq("status", "queued")
    .eq("paused", false)
    .or(`not_before.is.null,not_before.lte.${now}`)
    .order("time_sensitive", { ascending: false })
    .order("priority", { ascending: false })
    .order("not_before", { ascending: true })
    .limit(limit);

  if (error) throw error;

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const perConnMinute = new Map<string, number>();

  for (const raw of (rows || []) as OutboxRow[]) {
    processed += 1;
    if (!raw.connection_id) {
      skipped += 1;
      continue;
    }

    await new Promise((r) => setTimeout(r, jitterMs()));

    const conn = await getConnectionById(raw.connection_id);
    if (!conn || conn.status !== "active") {
      await supabaseAdmin
        .from(TABLES.EMAIL_OUTBOX)
        .update({ status: "paused", last_error: "connection_inactive", paused: true })
        .eq("id", raw.id);
      skipped += 1;
      continue;
    }

    if (conn.sendingPausedUntil && new Date(conn.sendingPausedUntil).getTime() > Date.now()) {
      continue;
    }
    if (conn.quotaExhaustedUntil && new Date(conn.quotaExhaustedUntil).getTime() > Date.now()) {
      continue;
    }

    const minuteUsed = perConnMinute.get(conn.id) || 0;
    const perMin = conn.perMinuteLimit || DEFAULT_PER_MINUTE;
    if (minuteUsed >= perMin) continue;

    const payload = (raw.payload || {}) as Record<string, unknown>;
    const kind = String(payload.kind || "custom");
    const capacity = await getCapacity({
      connection: conn,
      ownerId: conn.ownerId,
      kind,
      eventId: payload.eventId ? String(payload.eventId) : null,
    });
    const available = isTimeSensitiveKind(kind) ? capacity.remainingNow : capacity.remainingBulk;
    if (available < 1) continue;

    const skipReason = await revalidateRecipient({
      ...payload,
      connectionId: conn.id,
    });
    if (skipReason) {
      await supabaseAdmin
        .from(TABLES.EMAIL_OUTBOX)
        .update({
          status: "cancelled",
          skip_reason: skipReason,
          attempt_at: new Date().toISOString(),
        })
        .eq("id", raw.id);
      if (raw.batch_id) {
        const { data: batch } = await supabaseAdmin
          .from(TABLES.EMAIL_SEND_BATCHES)
          .select("skipped")
          .eq("id", raw.batch_id)
          .maybeSingle();
        await supabaseAdmin
          .from(TABLES.EMAIL_SEND_BATCHES)
          .update({
            skipped: (batch?.skipped || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", raw.batch_id);
      }
      skipped += 1;
      continue;
    }

    await supabaseAdmin
      .from(TABLES.EMAIL_OUTBOX)
      .update({
        status: "sending",
        attempt_at: new Date().toISOString(),
        attempt_count: (raw.attempt_count || 0) + 1,
      })
      .eq("id", raw.id);

    let subject = String(payload.subject || "Message");
    let html = payload.html ? String(payload.html) : undefined;
    let text = payload.text ? String(payload.text) : undefined;
    let certificateIdForStamp: string | null = null;

    if (kind === "certificate") {
      const rendered = await renderCertificateOutboxPayload(payload);
      if (!rendered.ok) {
        await supabaseAdmin
          .from(TABLES.EMAIL_OUTBOX)
          .update({
            status: "cancelled",
            skip_reason: rendered.reason,
            attempt_at: new Date().toISOString(),
          })
          .eq("id", raw.id);
        skipped += 1;
        continue;
      }
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
      certificateIdForStamp = rendered.certificateId;
    }

    const { withUnsubscribeFooter } = await import("./suppressions.service");
    const body = withUnsubscribeFooter({
      html,
      text,
      email: String(payload.to || ""),
      ownerId: conn.ownerId,
      kind,
    });
    const result = await sendAsConnection(
      {
        connectionId: conn.id,
        to: String(payload.to || ""),
        subject,
        html: body.html,
        text: body.text,
        kind,
        idempotencyKey: raw.idempotency_key || undefined,
      },
      conn.ownerId,
    );

    perConnMinute.set(conn.id, minuteUsed + 1);

    if (result.ok) {
      await supabaseAdmin
        .from(TABLES.EMAIL_OUTBOX)
        .update({ status: "sent", last_error: null })
        .eq("id", raw.id);
      if (certificateIdForStamp) {
        const { markCertificatesEmailed } =
          await import("@/src/features/certificates/certificates.service");
        await markCertificatesEmailed([certificateIdForStamp]).catch(() => null);
      }
      if (raw.batch_id) {
        const { data: batch } = await supabaseAdmin
          .from(TABLES.EMAIL_SEND_BATCHES)
          .select("sent, total, failed, skipped, cancelled")
          .eq("id", raw.batch_id)
          .maybeSingle();
        const nextSent = (batch?.sent || 0) + 1;
        const done =
          nextSent + (batch?.failed || 0) + (batch?.skipped || 0) + (batch?.cancelled || 0) >=
          (batch?.total || 0);
        await supabaseAdmin
          .from(TABLES.EMAIL_SEND_BATCHES)
          .update({
            sent: nextSent,
            status: done ? "completed" : "sending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", raw.batch_id);
      }
      sent += 1;
      continue;
    }

    const mapped = mapGoogleApiError(result.code === "QUOTA" ? 429 : 500, result.error || "");
    if (
      mapped.kind === "rate_limit" ||
      /550\s*5\.4\.5|rateLimitExceeded|userRateLimitExceeded/i.test(result.error || "")
    ) {
      await applyCircuitBreaker({
        connectionId: conn.id,
        ownerId: conn.ownerId,
        message: result.error || mapped.message,
      });
      await supabaseAdmin
        .from(TABLES.EMAIL_OUTBOX)
        .update({ status: "queued", last_error: result.error || mapped.message })
        .eq("id", raw.id);
      failed += 1;
      logger.warn("[outboxWorker] circuit breaker", { connectionId: conn.id });
      break;
    }

    await supabaseAdmin
      .from(TABLES.EMAIL_OUTBOX)
      .update({ status: "failed", last_error: result.error || "send_failed" })
      .eq("id", raw.id);
    if (raw.batch_id) {
      const { data: batch } = await supabaseAdmin
        .from(TABLES.EMAIL_SEND_BATCHES)
        .select("failed")
        .eq("id", raw.batch_id)
        .maybeSingle();
      await supabaseAdmin
        .from(TABLES.EMAIL_SEND_BATCHES)
        .update({
          failed: (batch?.failed || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", raw.batch_id);
    }
    failed += 1;
  }

  return { processed, sent, skipped, failed };
}
