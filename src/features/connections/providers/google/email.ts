import type { EmailSender } from "../provider";
import type { ConnectionSendInput, ConnectionSendResult } from "../../types";
import { mapGoogleApiError } from "./errors";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toList(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((e) => String(e || "").trim()).filter(Boolean);
}

function stripControls(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, " ").trim();
}

function encodeSubject(subject: string): string {
  const clean = stripControls(subject);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
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
    `Subject: ${encodeSubject(opts.subject)}`,
    "MIME-Version: 1.0",
    ...(opts.replyTo ? [`Reply-To: ${stripControls(opts.replyTo)}`] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const textPart = opts.text || opts.html?.replace(/<[^>]+>/g, " ") || "";
  const htmlPart = opts.html || `<pre>${textPart}</pre>`;
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    textPart,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlPart,
    `--${boundary}--`,
  ].join("\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const GoogleEmailSender: EmailSender = {
  async send(
    accessToken: string,
    input: ConnectionSendInput & { fromEmail: string; fromName?: string | null },
  ): Promise<ConnectionSendResult> {
    const list = toList(input.to);
    if (!list.length || !list.every(looksLikeEmail)) {
      return { ok: false, code: "INVALID", error: "Invalid recipient address" };
    }
    if (!input.html && !input.text) {
      return { ok: false, code: "INVALID", error: "Missing email body" };
    }

    // Attachments: build multipart/mixed via nodemailer when present
    if (input.attachments?.length) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: input.fromEmail,
          accessToken,
        },
      });
      const fromDisplay = input.fromName
        ? `${stripControls(input.fromName)} <${input.fromEmail}>`
        : input.fromEmail;
      try {
        await transporter.sendMail({
          from: fromDisplay,
          to: list.join(", "),
          subject: stripControls(input.subject),
          html: input.html,
          text: input.text,
          replyTo: input.replyTo,
          attachments: input.attachments.map((a) => ({
            filename: a.filename,
            content:
              typeof a.content === "string"
                ? Buffer.from(a.content, "base64")
                : Buffer.from(a.content),
            contentType: a.contentType,
          })),
        });
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        const mapped = mapGoogleApiError(401, message);
        return {
          ok: false,
          code: mapped.kind === "invalid_grant" ? "NEEDS_RECONNECT" : "SEND_FAILED",
          error: mapped.message,
        };
      }
    }

    const fromDisplay = input.fromName
      ? `${stripControls(input.fromName)} <${input.fromEmail}>`
      : input.fromEmail;
    const raw = mimeMessage({
      from: fromDisplay,
      to: list,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: toBase64Url(raw) }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const mapped = mapGoogleApiError(res.status, errText);
      return {
        ok: false,
        code:
          mapped.kind === "invalid_grant"
            ? "NEEDS_RECONNECT"
            : mapped.kind === "rate_limit"
              ? "QUOTA"
              : "SEND_FAILED",
        error: mapped.message,
      };
    }
    return { ok: true };
  },
};
