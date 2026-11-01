import "server-only";

import { Resend } from "resend";
import type { ReactElement } from "react";
import { getServerEnv } from "@/src/env";
import { logger } from "@/src/lib/logger";
import {
  platformArchiveBcc,
  platformReplyTo,
  RESEND_TEST_FROM,
  resolveLaneFrom,
  type PlatformEmailLane,
} from "@/src/lib/email/lanes";

export { RESEND_TEST_FROM };

/**
 * The only call site for the Resend SDK.
 *
 * Prefer `sendPlatformEmail` for SaaS/platform lanes (Reply-To + Bcc archive).
 * Organizer → attendee/cert/bulk mail must use organizer Google/SMTP transport
 * (`sendViaOrganizerConnection`) — never Resend.
 */
export type ResendAttachment = {
  filename: string;
  /** Base64 string or raw bytes (Buffer / Uint8Array). */
  content: string | Buffer | Uint8Array;
  contentType?: string;
};

export type ResendSendInput = {
  to: string | string[];
  subject: string;
  react?: ReactElement;
  html?: string;
  text?: string;
  /** Override From (rare). Prefer `lane` via `sendPlatformEmail`. */
  from?: string;
  replyTo?: string;
  bcc?: string | string[];
  attachments?: ResendAttachment[];
};

export type ResendSendResult = {
  ok: boolean;
  dryRun?: boolean;
  id?: string;
  error?: string;
};

/** @deprecated Prefer `resolveLaneFrom("default")` or `sendPlatformEmail`. */
export function fromAddress(): string | null {
  const env = getServerEnv();
  const raw = (env.RESEND_FROM_EMAIL || env.RESEND_FROM || env.MAIL_FROM || "").trim();
  if (!raw) {
    return env.RESEND_API_KEY?.trim() ? `Avoeline <${RESEND_TEST_FROM}>` : null;
  }
  return raw.includes("<") ? raw : `Avoeline <${raw}>`;
}

export function resendConfigured(): boolean {
  return Boolean(getServerEnv().RESEND_API_KEY?.trim());
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((e) => String(e || "").trim())
    .filter(Boolean);
}

export async function sendEmail({
  to,
  subject,
  react,
  html,
  text,
  from: fromOverride,
  replyTo,
  bcc,
  attachments,
}: ResendSendInput): Promise<ResendSendResult> {
  const apiKey = getServerEnv().RESEND_API_KEY?.trim();
  const from = (fromOverride || fromAddress())?.trim() || null;
  const list = normalizeList(to);
  const bccList = normalizeList(bcc);

  if (!list.length || !list.every(looksLikeEmail)) {
    logger.warn("[sendEmail] refusing invalid recipient address(es)");
    return { ok: false, error: "Invalid recipient address" };
  }
  if (bccList.length && !bccList.every(looksLikeEmail)) {
    logger.warn("[sendEmail] refusing invalid bcc address(es)");
    return { ok: false, error: "Invalid bcc address" };
  }
  if (!react && !html) {
    logger.warn("[sendEmail] missing react or html body");
    return { ok: false, error: "Missing email body" };
  }

  if (!apiKey || !from) {
    logger.warn(
      `[sendEmail] RESEND_API_KEY missing — not sending. ` +
        `Add RESEND_API_KEY to .env.local (optional RESEND_FROM_EMAIL, default ${RESEND_TEST_FROM}).`,
    );
    return { ok: false, dryRun: true, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const toField = list.length === 1 ? list[0] : list;
    const attachmentPayload = (attachments ?? []).map((a) => {
      const raw = a.content;
      const content = typeof raw === "string" ? raw : Buffer.from(raw).toString("base64");
      return {
        filename: a.filename,
        content,
        ...(a.contentType ? { contentType: a.contentType } : {}),
      };
    });
    const base = {
      from,
      to: toField,
      subject,
      ...(replyTo ? { replyTo } : {}),
      ...(bccList.length ? { bcc: bccList.length === 1 ? bccList[0] : bccList } : {}),
      ...(text ? { text } : {}),
      ...(attachmentPayload.length ? { attachments: attachmentPayload } : {}),
    };
    const { data, error } = react
      ? await resend.emails.send({ ...base, react })
      : await resend.emails.send({ ...base, html: html! });
    if (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: string }).message)
          : JSON.stringify(error);
      logger.error("[sendEmail] Resend rejected the send", { subject, error: message });
      return { ok: false, error: message };
    }
    logger.info("[sendEmail] sent", { id: data?.id, subject });
    return { ok: true, id: data?.id };
  } catch (err) {
    logger.error("[sendEmail] Resend request failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: err instanceof Error ? err.message : "Resend request failed" };
  }
}

export type PlatformEmailInput = Omit<ResendSendInput, "from" | "replyTo" | "bcc"> & {
  lane?: PlatformEmailLane;
  /** Extra Bcc beyond the archive (archive is always included). */
  extraBcc?: string | string[];
  /** Override Reply-To (defaults to RESEND_REPLY_TO / info@). */
  replyTo?: string;
};

/**
 * Platform / SaaS mail: lane From alias + always Reply-To and archive Bcc.
 */
export async function sendPlatformEmail({
  lane = "default",
  replyTo,
  extraBcc,
  ...rest
}: PlatformEmailInput): Promise<ResendSendResult> {
  const archive = platformArchiveBcc();
  const bcc = [...normalizeList(extraBcc), ...(archive ? [archive] : [])];
  return sendEmail({
    ...rest,
    from: resolveLaneFrom(lane),
    replyTo: replyTo?.trim() || platformReplyTo(),
    ...(bcc.length ? { bcc } : {}),
  });
}

export type { PlatformEmailLane };
