/**
 * HTML email helpers used by registration, certificates, tenant welcome, etc.
 *
 * Transport preference:
 * 1. Resend when `RESEND_API_KEY` is set (same path as React Email / notifications)
 * 2. Brevo when only `BREVO_API_KEY` + `MAIL_FROM` are set
 *
 * Server-only. Never import from a Client Component.
 */

import { fromAddress, resendConfigured, sendEmail as sendViaResend } from "@/src/lib/email/resend";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Brevo caps messageVersions at 1000 per request. Chunking at that boundary
 * keeps a 5,000-attendee send to five calls rather than five thousand.
 */
const MAX_VERSIONS_PER_CALL = 1000;

/** Soft concurrency for Resend bulk (no messageVersions API). */
const RESEND_BULK_CONCURRENCY = 8;

export type Recipient = { email: string; name?: string };

export type EmailMessage = {
  subject: string;
  html: string;
  text?: string;
  /** Display name on the From line. */
  senderName?: string;
  replyTo?: Recipient;
};

export type SendOutcome = { sent: number; failed: number; skipped: boolean };

export type BulkOptions = {
  personalize?: (recipient: Recipient) => { subject?: string; html?: string; text?: string };
};

/** Escape anything user-supplied before it goes into an HTML body. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function senderFor(from: string, senderName?: string) {
  return { email: from, name: senderName ? `${senderName} (via Avoeline)` : "Avoeline" };
}

async function postBrevo(body: unknown, apiKey: string, label: string): Promise<boolean> {
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(
        `[${label}] Brevo rejected the send (${response.status})`,
        await response.text().catch(() => ""),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[${label}] Brevo request failed`, err);
    return false;
  }
}

function resendFromDisplay(senderName?: string): string {
  const base = fromAddress() || "Avoeline <onboarding@resend.dev>";
  if (!senderName) return base;
  const match = base.match(/<([^>]+)>/);
  const addr =
    match?.[1] || base.replace(/^.*</, "").replace(/>$/, "").trim() || "onboarding@resend.dev";
  return `${senderName} (via Avoeline) <${addr}>`;
}

/** One message to one recipient. Never throws; returns false if nothing was sent. */
export async function sendEmail(
  to: Recipient,
  message: EmailMessage,
  _unused?: unknown,
): Promise<boolean> {
  if (!looksLikeEmail(to.email)) {
    console.warn("[sendEmail] refusing an invalid recipient address");
    return false;
  }

  if (resendConfigured()) {
    if (message.senderName) return sendViaResendNamed(to.email, message);
    const result = await sendViaResend({
      to: to.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo?.email,
    });
    if (!result.ok) {
      console.error("[sendEmail] Resend HTML send failed", result.error);
    }
    return result.ok;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      `[sendEmail] no RESEND_API_KEY (or BREVO_API_KEY/MAIL_FROM) — not sending to ${to.email}: ${message.subject}`,
    );
    return false;
  }

  return postBrevo(
    {
      sender: senderFor(from, message.senderName),
      to: [{ email: to.email, name: to.name || undefined }],
      ...(message.replyTo
        ? { replyTo: { email: message.replyTo.email, name: message.replyTo.name || undefined } }
        : {}),
      subject: message.subject,
      htmlContent: message.html,
      ...(message.text ? { textContent: message.text } : {}),
    },
    apiKey,
    "sendEmail",
  );
}

async function sendViaResendNamed(to: string, message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: resendFromDisplay(message.senderName),
      to,
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
      ...(message.replyTo?.email ? { replyTo: message.replyTo.email } : {}),
    });
    if (error) {
      console.error("[sendEmail] Resend rejected named HTML send", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sendEmail] Resend named HTML send failed", err);
    return false;
  }
}

/**
 * One message to many recipients. With Resend, sends in small parallel batches
 * (one recipient per request so addresses are not disclosed in a shared To).
 * With Brevo, uses messageVersions chunks of 1000.
 */
export async function sendBulkEmail(
  recipients: Recipient[],
  message: EmailMessage,
  options: BulkOptions = {},
): Promise<SendOutcome> {
  const seen = new Set<string>();
  const clean = recipients.filter((r) => {
    const email = String(r?.email ?? "")
      .trim()
      .toLowerCase();
    if (!looksLikeEmail(email) || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  if (!clean.length) return { sent: 0, failed: 0, skipped: false };

  if (resendConfigured()) {
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < clean.length; i += RESEND_BULK_CONCURRENCY) {
      const chunk = clean.slice(i, i + RESEND_BULK_CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (r) => {
          const own = options.personalize?.(r);
          return sendEmail(r, {
            subject: own?.subject ?? message.subject,
            html: own?.html ?? message.html,
            text: own?.text ?? message.text,
            senderName: message.senderName,
            replyTo: message.replyTo,
          });
        }),
      );
      for (const ok of results) {
        if (ok) sent += 1;
        else failed += 1;
      }
    }
    return { sent, failed, skipped: false };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      `[sendBulkEmail] no RESEND_API_KEY (or BREVO) — not sending to ${clean.length} recipient(s): ${message.subject}`,
    );
    return { sent: 0, failed: 0, skipped: true };
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < clean.length; i += MAX_VERSIONS_PER_CALL) {
    const chunk = clean.slice(i, i + MAX_VERSIONS_PER_CALL);
    const ok = await postBrevo(
      {
        sender: senderFor(from, message.senderName),
        to: [{ email: chunk[0].email, name: chunk[0].name || undefined }],
        ...(message.replyTo
          ? { replyTo: { email: message.replyTo.email, name: message.replyTo.name || undefined } }
          : {}),
        subject: message.subject,
        htmlContent: message.html,
        ...(message.text ? { textContent: message.text } : {}),
        messageVersions: chunk.map((r) => {
          const own = options.personalize?.(r);
          return {
            to: [{ email: r.email, name: r.name || undefined }],
            ...(own?.subject ? { subject: own.subject } : {}),
            ...(own?.html ? { htmlContent: own.html } : {}),
            ...(own?.text ? { textContent: own.text } : {}),
          };
        }),
      },
      apiKey,
      "sendBulkEmail",
    );
    if (ok) sent += chunk.length;
    else failed += chunk.length;
  }

  return { sent, failed, skipped: false };
}
