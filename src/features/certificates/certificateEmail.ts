import { escapeHtml } from "@/src/lib/email";
import { formatDateMedium } from "@/src/lib/datetime";
import type { CertificateRow } from "@/src/features/certificates/types";

/**
 * Email that tells someone their certificate is ready.
 * Primary CTA: on-demand PDF at `/certificate/[code]/download` (opens on Avoeline;
 * no PDF is stored in Storage). Secondary: public verify page.
 */
export function buildCertificateEmail(
  certificate: CertificateRow,
  verifyUrl: string,
  downloadUrl?: string,
): { subject: string; html: string; text: string } {
  const name = certificate.data.recipient_name || "there";
  const eventTitle = certificate.data.event_title || "the event";
  const role = certificate.data.role || "Attendee";
  const issued = formatDateMedium(certificate.issuedAt || certificate.createdAt);
  const openUrl = downloadUrl || verifyUrl;

  const subject = `Your certificate — ${eventTitle}`;

  const facts: Array<[string, string]> = [
    ["Event", eventTitle],
    ["Awarded as", role],
    ["Issued", issued],
    ["Verification code", certificate.verificationCode],
  ];

  const text = [
    `Hi ${name},`,
    "",
    `Your certificate for ${eventTitle} is ready.`,
    "",
    ...facts.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open your certificate on Avoeline: ${openUrl}`,
    `Verify authenticity: ${verifyUrl}`,
    "",
    "Your certificate opens on Avoeline — we do not email a stored PDF file.",
    "Anyone with the verify link can confirm the certificate is genuine.",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px">
  <tr><td style="padding:32px 32px 8px">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600">Your certificate is ready</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#525252">Hi ${escapeHtml(name)}, your certificate for ${escapeHtml(eventTitle)} has been issued. It opens on Avoeline — we do not store a PDF in email storage.</p>
  </td></tr>
  <tr><td style="padding:8px 32px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px">
      ${facts
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 0;color:#737373;border-bottom:1px solid #f0f0f0">${escapeHtml(k)}</td>
             <td style="padding:8px 0;text-align:right;border-bottom:1px solid #f0f0f0">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}
    </table>
    <p style="margin:24px 0 0"><a href="${escapeHtml(openUrl)}"
      style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Open certificate</a></p>
    <p style="margin:12px 0 0"><a href="${escapeHtml(verifyUrl)}"
      style="display:inline-block;padding:10px 16px;background:#f5f5f5;color:#171717;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #e5e5e5">Verify authenticity</a></p>
    <p style="margin:16px 0 0;font-size:12px;color:#737373">Opens on Avoeline. Anyone with the verify link can confirm it is genuine.</p>
  </td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}
