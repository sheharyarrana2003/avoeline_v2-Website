import { escapeHtml } from "@/src/lib/email";
import { formatDateMedium } from "@/src/lib/datetime";
import type { CertificateDocument } from "@/src/services/models/certificate.model";

/**
 * The email that tells someone their certificate is ready.
 *
 * Composed separately from the sending, the same way `buildRegistrationEmail`
 * is, so the message can be built and logged with no mail provider configured
 * at all -- which is the state this ships in until a key exists.
 *
 * The link is the public verification page rather than a signed download URL.
 * A signed URL expires within the hour and would be dead by the time most
 * people opened the mail; the verification page never expires, works with no
 * account, offers the PDF itself, and is the thing they will want to send to an
 * employer anyway.
 */
export function buildCertificateEmail(
    certificate: CertificateDocument,
    verifyUrl: string,
): { subject: string; html: string; text: string } {
    const name = certificate.content?.recipientName || "there";
    const eventTitle = certificate.content?.eventTitle || "the event";
    const role = certificate.content?.role || "Attendee";
    const issued = formatDateMedium(certificate.issuedAt || certificate.createdAt);

    const subject = `Your certificate — ${eventTitle}`;

    const facts: Array<[string, string]> = [
        ["Event", eventTitle],
        ["Awarded as", role],
        ["Issued", issued],
        ["Certificate ID", certificate.certificateId],
    ];

    const text = [
        `Hi ${name},`,
        "",
        `Your certificate for ${eventTitle} is ready.`,
        "",
        ...facts.map(([k, v]) => `${k}: ${v}`),
        "",
        `View, download or share it: ${verifyUrl}`,
        "",
        "Anyone with that link can confirm the certificate is genuine, so it is the one to send to an employer.",
    ].join("\n");

    // Table layout with inline styles, matching the registration email: mail
    // clients strip <style> blocks and have no layout engine worth relying on.
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
    <p style="margin:24px 0 0"><a href="${escapeHtml(verifyUrl)}"
      style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View your certificate</a></p>
    <p style="margin:16px 0 0;font-size:12px;color:#737373">Anyone with that link can confirm it is genuine, so it is the one to send to an employer.</p>
  </td></tr>
</table>
</body></html>`;

    return { subject, html, text };
}
