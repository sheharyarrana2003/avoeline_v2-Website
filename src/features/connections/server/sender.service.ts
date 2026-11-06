import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { GoogleEmailSender } from "../providers/google/email";
import {
  assertGoogleNotKilled,
  findActiveEmailConnection,
  getAccessTokenForConnection,
  getConnectionById,
  markBlockedByAdmin,
  markNeedsReconnect,
} from "./connections.service";
import { getCapacity } from "./capacity.service";
import { writeConnectionAudit } from "./audit.service";
import { assertMayUseConnection } from "./assertConnectionsAccess";
import { findOrgConnectionsWithGrant } from "./grants.service";
import { pickSenderCandidate } from "../lib/resolveSender.logic";
import { isTimeSensitiveKind } from "../lib/capacityMath";
import { mapGoogleApiError } from "../providers/google/errors";
import type {
  ConnectionOwnerType,
  ConnectionSendInput,
  ConnectionSendResult,
  ResolvedSender,
} from "../types";

async function toResolved(connectionId: string): Promise<ResolvedSender | null> {
  const conn = await getConnectionById(connectionId);
  if (!conn || conn.status !== "active") return null;
  const emailCap = conn.capabilities.find((c) => c.capability === "email.send" && c.enabled);
  if (!emailCap) return null;
  const settings = (emailCap.settings || {}) as { from_email?: string; from_name?: string };
  return {
    connectionId: conn.id,
    providerEmail: conn.providerEmail,
    displayName: conn.displayName,
    fromEmail: settings.from_email || conn.providerEmail,
    fromName: settings.from_name || conn.displayName,
  };
}

/**
 * docs/17 §6 — first match: event default → personal default → org grant → null.
 * Never falls back to platform Resend.
 */
export async function resolveSender(opts: {
  actorId: string;
  orgContext?: string | null;
  eventId?: string | null;
  kind?: string;
  /** Explicit picker override (must pass may-use). */
  connectionId?: string | null;
}): Promise<ResolvedSender | null> {
  if (opts.connectionId) {
    const may = await assertMayUseConnection({
      userId: opts.actorId,
      connectionId: opts.connectionId,
      capability: "email.send",
    });
    if (!may.ok) return null;
    const conn = await getConnectionById(opts.connectionId);
    if (!conn) return null;
    const killed = await assertGoogleNotKilled({
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: opts.actorId,
    });
    if (!killed.ok) return null;
    return toResolved(opts.connectionId);
  }

  let eventDefaultId: string | null = null;
  if (opts.eventId) {
    const { data: pref } = await supabaseAdmin
      .from(TABLES.SENDER_PREFERENCES)
      .select("connection_id")
      .eq("event_id", opts.eventId)
      .maybeSingle();
    eventDefaultId = pref?.connection_id ?? null;
  }

  const { data: personalPref } = await supabaseAdmin
    .from(TABLES.SENDER_PREFERENCES)
    .select("connection_id")
    .eq("owner_type", "user")
    .eq("owner_id", opts.actorId)
    .is("event_id", null)
    .maybeSingle();
  let personalDefaultId = personalPref?.connection_id ?? null;
  if (!personalDefaultId) {
    const personal = await findActiveEmailConnection({
      ownerType: "user",
      ownerId: opts.actorId,
    });
    personalDefaultId = personal?.id ?? null;
  }

  let orgGrantId: string | null = null;
  if (opts.orgContext) {
    orgGrantId = await findOrgConnectionsWithGrant({
      orgId: opts.orgContext,
      userId: opts.actorId,
      capability: "email.send",
    });
  }

  const allowedIds = new Set<string>();
  for (const id of [eventDefaultId, personalDefaultId, orgGrantId]) {
    if (!id) continue;
    const may = await assertMayUseConnection({
      userId: opts.actorId,
      connectionId: id,
      capability: "email.send",
    });
    if (may.ok) allowedIds.add(id);
  }

  const picked = pickSenderCandidate({
    eventDefaultId,
    personalDefaultId,
    orgGrantId,
    allowedIds,
  });
  if (!picked) return null;

  const conn = await getConnectionById(picked.connectionId);
  if (!conn) return null;
  const killed = await assertGoogleNotKilled({
    ownerType: conn.ownerType,
    ownerId: conn.ownerId,
    actorId: opts.actorId,
  });
  if (!killed.ok) return null;
  return toResolved(picked.connectionId);
}

async function recordOrganizerSendLog(opts: {
  connectionId: string;
  ownerId: string;
  actorId?: string | null;
  kind: string;
  to: string;
  subject: string;
  idempotencyKey?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin.from(TABLES.EMAIL_LOG).insert({
    kind: opts.kind.slice(0, 80),
    lane: "organizer",
    recipient: opts.to.trim().toLowerCase().slice(0, 320),
    user_id: opts.actorId || opts.ownerId,
    subject: opts.subject.slice(0, 500),
    status: "sent",
    payload: {},
    connection_id: opts.connectionId,
    idempotency_key: opts.idempotencyKey || null,
    sent_at: now,
  });
}

export async function sendAsConnection(
  input: ConnectionSendInput & { kind?: string; idempotencyKey?: string },
  actorId?: string,
): Promise<ConnectionSendResult> {
  const conn = await getConnectionById(input.connectionId);
  if (!conn || conn.status !== "active") {
    return {
      ok: false,
      code: "NO_CONNECTION",
      error: "Connect Google before sending.",
    };
  }

  const killed = await assertGoogleNotKilled({
    ownerType: conn.ownerType,
    ownerId: conn.ownerId,
    actorId,
  });
  if (!killed.ok) {
    return { ok: false, code: "DISABLED", error: killed.error };
  }

  const kind = input.kind || "custom";
  const capacity = await getCapacity({
    connection: conn,
    ownerId: conn.ownerId,
    kind,
  });
  const available = isTimeSensitiveKind(kind) ? capacity.remainingNow : capacity.remainingBulk;
  if (available < 1 || capacity.blockedReason) {
    return {
      ok: false,
      code: "QUOTA",
      error: capacity.blockedReason || "No send capacity remaining.",
    };
  }

  const emailCap = conn.capabilities.find((c) => c.capability === "email.send" && c.enabled);
  if (!emailCap) {
    return {
      ok: false,
      code: "NO_CONNECTION",
      error: "Email send is not enabled on this connection.",
    };
  }
  const settings = (emailCap.settings || {}) as { from_email?: string; from_name?: string };
  const fromEmail = settings.from_email || conn.providerEmail;
  const fromName = settings.from_name || conn.displayName;

  if (actorId) {
    const may = await assertMayUseConnection({
      userId: actorId,
      connectionId: conn.id,
      capability: "email.send",
    });
    if (!may.ok) {
      return { ok: false, code: "NO_CONNECTION", error: may.error };
    }
  }

  try {
    const accessToken = await getAccessTokenForConnection(conn.id);
    const result = await GoogleEmailSender.send(accessToken, {
      ...input,
      fromEmail,
      fromName,
    });
    if (!result.ok) {
      if (result.code === "NEEDS_RECONNECT") {
        await markNeedsReconnect(conn.id, result.error || "needs_reconnect");
      }
      const mapped = mapGoogleApiError(500, result.error || "");
      if (mapped.kind === "admin_blocked") {
        await markBlockedByAdmin(conn.id, mapped.message);
      }
      return result;
    }

    const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((e) =>
      String(e).trim().toLowerCase(),
    );
    for (const to of recipients) {
      await recordOrganizerSendLog({
        connectionId: conn.id,
        ownerId: conn.ownerId,
        actorId: actorId ?? null,
        kind,
        to,
        subject: input.subject,
        idempotencyKey: input.idempotencyKey || null,
      }).catch(() => undefined);
    }

    await writeConnectionAudit({
      connectionId: conn.id,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
      actorId: actorId ?? null,
      action: "send",
      details: { subjectLen: input.subject?.length ?? 0, kind },
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    if (/invalid_grant|reconnect/i.test(message)) {
      await markNeedsReconnect(conn.id, message);
      return { ok: false, code: "NEEDS_RECONNECT", error: message };
    }
    return { ok: false, code: "SEND_FAILED", error: message };
  }
}

/** Organizer-facing helper used by legacy transport wrappers. */
export async function sendAsOrganizer(opts: {
  organizerId: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  kind?: string;
  eventId?: string | null;
  orgContext?: string | null;
  connectionId?: string | null;
  attachments?: ConnectionSendInput["attachments"];
  idempotencyKey?: string;
}): Promise<ConnectionSendResult & { connectionId?: string }> {
  const sender = await resolveSender({
    actorId: opts.organizerId,
    kind: opts.kind,
    eventId: opts.eventId,
    orgContext: opts.orgContext,
    connectionId: opts.connectionId,
  });
  if (!sender) {
    return {
      ok: false,
      code: "NO_CONNECTION",
      error: "Connect Google before sending attendee email.",
    };
  }
  const result = await sendAsConnection(
    {
      connectionId: sender.connectionId,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
      attachments: opts.attachments,
      kind: opts.kind || "custom",
      idempotencyKey: opts.idempotencyKey,
    },
    opts.organizerId,
  );
  return { ...result, connectionId: sender.connectionId };
}

export async function stampEmailLogConnection(
  emailLogId: string,
  connectionId: string,
): Promise<void> {
  await supabaseAdmin
    .from(TABLES.EMAIL_LOG)
    .update({ connection_id: connectionId })
    .eq("id", emailLogId);
}

export type { ConnectionOwnerType, ResolvedSender };
