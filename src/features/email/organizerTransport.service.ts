import "server-only";

import nodemailer from "nodemailer";
import { logger } from "@/src/lib/logger";
import {
  getActiveConnectionRow,
  markConnectionTested,
  readConnectionSecrets,
  refreshGoogleAccessToken,
  type GoogleSecrets,
  type SmtpSecrets,
} from "@/src/features/email/organizerEmailConnection.service";

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
  attachments?: OrganizerSendAttachment[];
};

export type OrganizerSendResult = {
  ok: boolean;
  error?: string;
  code?: "NO_CONNECTION" | "SEND_FAILED" | "INVALID";
};

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toList(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((e) => String(e || "").trim()).filter(Boolean);
}

function mimeMessage(opts: {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}): string {
  const boundary = `avoeline_${Date.now().toString(36)}`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to.join(", ")}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    ...(opts.replyTo ? [`Reply-To: ${opts.replyTo}`] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const textPart = opts.text || opts.html?.replace(/<[^>]+>/g, " ") || "";
  const htmlPart = opts.html || `<pre>${textPart}</pre>`;
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    textPart,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlPart,
    `--${boundary}--`,
  ].join("\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

async function sendViaGmail(
  row: NonNullable<Awaited<ReturnType<typeof getActiveConnectionRow>>>,
  input: OrganizerSendInput,
  list: string[],
): Promise<OrganizerSendResult> {
  const accessToken = await refreshGoogleAccessToken(row);
  const fromDisplay = row.from_name ? `${row.from_name} <${row.from_email}>` : row.from_email;
  // Attachments via Gmail raw MIME without multipart/mixed is limited — use text/html body;
  // when attachments present, fall through to SMTP-style raw with nodemailer + OAuth2 below.
  if (input.attachments?.length) {
    const secrets = readConnectionSecrets(row) as GoogleSecrets;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: row.from_email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: secrets.refresh_token,
        accessToken,
      },
    });
    await transporter.sendMail({
      from: fromDisplay,
      to: list.join(", "),
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      attachments: input.attachments.map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === "string" ? Buffer.from(a.content, "base64") : Buffer.from(a.content),
        contentType: a.contentType,
      })),
    });
    return { ok: true };
  }

  const raw = mimeMessage({
    from: fromDisplay,
    to: list,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Gmail send failed (${res.status})`);
  }
  return { ok: true };
}

async function sendViaSmtp(
  row: NonNullable<Awaited<ReturnType<typeof getActiveConnectionRow>>>,
  input: OrganizerSendInput,
  list: string[],
): Promise<OrganizerSendResult> {
  const secrets = readConnectionSecrets(row) as SmtpSecrets;
  if (!row.smtp_host || !row.smtp_user) {
    return { ok: false, code: "NO_CONNECTION", error: "SMTP connection incomplete" };
  }
  const transporter = nodemailer.createTransport({
    host: row.smtp_host,
    port: row.smtp_port || 465,
    secure: row.smtp_secure !== false,
    auth: {
      user: row.smtp_user,
      pass: secrets.password,
    },
  });
  const fromDisplay = row.from_name ? `${row.from_name} <${row.from_email}>` : row.from_email;
  await transporter.sendMail({
    from: fromDisplay,
    to: list.join(", "),
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    attachments: (input.attachments ?? []).map((a) => ({
      filename: a.filename,
      content:
        typeof a.content === "string" ? Buffer.from(a.content, "base64") : Buffer.from(a.content),
      contentType: a.contentType,
    })),
  });
  return { ok: true };
}

/**
 * Fail-closed gate for organizer-initiated mail (interview / access invites).
 * Returns NO_CONNECTION when there is no active Google/SMTP connection.
 */
export async function requireConnectedSender(
  organizerId: string,
): Promise<OrganizerSendResult & { connected: boolean }> {
  if (!organizerId) {
    return {
      ok: false,
      connected: false,
      code: "NO_CONNECTION",
      error: "Connect your email before sending.",
    };
  }
  const row = await getActiveConnectionRow(organizerId);
  if (!row) {
    return {
      ok: false,
      connected: false,
      code: "NO_CONNECTION",
      error: "Connect your email to send automatically.",
    };
  }
  return { ok: true, connected: true };
}

/**
 * Organizer → attendee / cert / bulk transport.
 * Fail-closed when no active Google/SMTP connection (no Resend fallback).
 */
export async function sendViaOrganizerConnection(
  input: OrganizerSendInput,
): Promise<OrganizerSendResult> {
  const list = toList(input.to);
  if (!list.length || !list.every(looksLikeEmail)) {
    return { ok: false, code: "INVALID", error: "Invalid recipient address" };
  }
  if (!input.html && !input.text) {
    return { ok: false, code: "INVALID", error: "Missing email body" };
  }

  const row = await getActiveConnectionRow(input.organizerId);
  if (!row) {
    return {
      ok: false,
      code: "NO_CONNECTION",
      error: "Connect Google before sending attendee email.",
    };
  }

  try {
    const result =
      row.provider === "google"
        ? await sendViaGmail(row, input, list)
        : await sendViaSmtp(row, input, list);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    logger.error("[sendViaOrganizerConnection]", {
      organizerId: input.organizerId,
      provider: row.provider,
      err: message,
    });
    await markConnectionTested(input.organizerId, false, message).catch(() => undefined);
    return { ok: false, code: "SEND_FAILED", error: message };
  }
}

export async function testOrganizerConnection(
  organizerId: string,
  to: string,
): Promise<OrganizerSendResult> {
  const result = await sendViaOrganizerConnection({
    organizerId,
    to,
    subject: "Avoeline email connection test",
    text: "Your organizer email connection works. You can send attendee and certificate mail.",
    html: "<p>Your organizer email connection works. You can send attendee and certificate mail.</p>",
  });
  await markConnectionTested(organizerId, result.ok, result.error).catch(() => undefined);
  return result;
}
