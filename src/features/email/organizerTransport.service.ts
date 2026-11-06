import "server-only";

import { logger } from "@/src/lib/logger";
import { resolveSender, sendAsOrganizer } from "@/src/features/connections/server/sender.service";

export type OrganizerSendAttachment = {
  filename: string;
  content: string | Buffer | Uint8Array;
  contentType?: string;
};

export type OrganizerSendInput = {
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
  attachments?: OrganizerSendAttachment[];
};

export type OrganizerSendResult = {
  ok: boolean;
  error?: string;
  code?: "NO_CONNECTION" | "SEND_FAILED" | "INVALID" | "QUOTA" | "DISABLED" | "NEEDS_RECONNECT";
  connectionId?: string;
};

/**
 * Fail-closed gate for organizer-initiated mail (docs/17 resolveSender).
 * Never falls back to platform Resend.
 */
export async function requireConnectedSender(
  organizerId: string,
  opts?: { eventId?: string | null; orgContext?: string | null; connectionId?: string | null },
): Promise<OrganizerSendResult & { connected: boolean }> {
  if (!organizerId) {
    return {
      ok: false,
      connected: false,
      code: "NO_CONNECTION",
      error: "Connect your email before sending.",
    };
  }
  const sender = await resolveSender({
    actorId: organizerId,
    eventId: opts?.eventId,
    orgContext: opts?.orgContext,
    connectionId: opts?.connectionId,
  });
  if (!sender) {
    return {
      ok: false,
      connected: false,
      code: "NO_CONNECTION",
      error: "Connect your email to send automatically.",
    };
  }
  return { ok: true, connected: true, connectionId: sender.connectionId };
}

/**
 * Organizer → attendee / cert / bulk transport via Connections (no direct Google).
 * Fail-closed when no active email.send connection (no Resend fallback).
 */
export async function sendViaOrganizerConnection(
  input: OrganizerSendInput,
): Promise<OrganizerSendResult> {
  try {
    const result = await sendAsOrganizer({
      organizerId: input.organizerId,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      kind: input.kind,
      eventId: input.eventId,
      orgContext: input.orgContext,
      connectionId: input.connectionId,
      attachments: input.attachments,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    logger.error("[sendViaOrganizerConnection]", {
      organizerId: input.organizerId,
      err: message,
    });
    return { ok: false, code: "SEND_FAILED", error: message };
  }
}

export async function testOrganizerConnection(
  organizerId: string,
  to: string,
): Promise<OrganizerSendResult> {
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject: "Avoeline email connection test",
    text: "Your organizer email connection works. You can send attendee and certificate mail.",
    html: "<p>Your organizer email connection works. You can send attendee and certificate mail.</p>",
  });
}
