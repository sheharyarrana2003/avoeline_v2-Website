import { escapeHtml } from "@/src/lib/email";
import { formatDateMedium } from "@/src/lib/datetime";
import type { CertificateRow } from "@/src/features/certificates/types";

export const DRIVE_SHARE_WARNING =
  "Anyone with this Google Drive link can view that file. Only include it if you accept that risk.";

/**
 * Certificate-ready email.
 * Primary CTA: website viewer `/certificate/[code]` (works with Drive down).
 * Drive link only when organizer opted in and a share URL exists.
 */
export function buildCertificateEmail(
  certificate: CertificateRow,
  verifyUrl: string,
  viewerUrl: string,
  opts?: { driveShareUrl?: string | null; includeDriveLink?: boolean },
): { subject: string; html: string; text: string } {
  const name = certificate.data.recipient_name || "there";
  const eventTitle = certificate.data.event_title || "the event";
  const role = certificate.data.role || "Attendee";
  const issued = formatDateMedium(certificate.issuedAt || certificate.createdAt);
  const openUrl = viewerUrl || verifyUrl;
  const drive =
    opts?.includeDriveLink && opts.driveShareUrl ? String(opts.driveShareUrl).trim() : "";

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
    `View your certificate: ${openUrl}`,
    drive ? `Google Drive copy (shared link): ${drive}` : null,
    `Verify authenticity: ${verifyUrl}`,
    "",
    "Anyone with the verify link can confirm the certificate is genuine.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px">
  <tr><td style="padding:32px 32px 8px">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600">Your certificate is ready</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#525252">Hi ${escapeHtml(name)}, your certificate for ${escapeHtml(eventTitle)} has been issued.</p>
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
      style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View certificate</a></p>
    ${
      drive
        ? `<p style="margin:12px 0 0"><a href="${escapeHtml(drive)}"
      style="display:inline-block;padding:10px 16px;background:#f5f5f5;color:#171717;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #e5e5e5">Open Drive copy</a></p>`
        : ""
    }
    <p style="margin:12px 0 0"><a href="${escapeHtml(verifyUrl)}"
      style="display:inline-block;padding:10px 16px;background:#f5f5f5;color:#171717;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #e5e5e5">Verify authenticity</a></p>
    <p style="margin:16px 0 0;font-size:12px;color:#737373">Anyone with the verify link can confirm it is genuine.</p>
  </td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}

/** Pure helper for tests — when Drive link may appear in email. */
export function shouldIncludeDriveLinkInEmail(opts: {
  includeDriveLink: boolean;
  driveShareUrl?: string | null;
}): boolean {
  return Boolean(opts.includeDriveLink && String(opts.driveShareUrl || "").trim());
}
