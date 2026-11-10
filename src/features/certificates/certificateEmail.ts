import type { CertificateRow } from "@/src/features/certificates/types";

export const DRIVE_SHARE_WARNING =
  "Anyone with this Google Drive link can view that file. Only include it if you accept that risk.";

/**
 * Certificate-ready email (sync wrapper for tests / outbox).
 * Prefer `renderCertificateReadyEmail` for organizer send path.
 */
export function buildCertificateEmail(
  certificate: CertificateRow,
  verifyUrl: string,
  viewerUrl: string,
  opts?: {
    driveShareUrl?: string | null;
    includeDriveLink?: boolean;
    organizerName?: string;
  },
): { subject: string; html: string; text: string } {
  // Sync fallback kept for unit tests that don't await React Email.
  // Production outbox uses renderCertificateReadyEmail (async).
  const name = certificate.data.recipient_name || "there";
  const eventTitle = certificate.data.event_title || "the event";
  const openUrl = viewerUrl || verifyUrl;
  const drive =
    opts?.includeDriveLink && opts.driveShareUrl ? String(opts.driveShareUrl).trim() : "";
  const subject = `Your certificate — ${eventTitle}`;
  const text = [
    `Hi ${name},`,
    "",
    `Your certificate for ${eventTitle} is ready.`,
    "",
    `View your certificate: ${openUrl}`,
    drive ? `Google Drive copy (shared link): ${drive}` : null,
    `Verify authenticity: ${verifyUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  return {
    subject,
    html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
    text,
  };
}

export async function buildCertificateEmailAsync(
  certificate: CertificateRow,
  verifyUrl: string,
  viewerUrl: string,
  opts?: {
    driveShareUrl?: string | null;
    includeDriveLink?: boolean;
    organizerName?: string;
  },
): Promise<{ subject: string; html: string; text: string }> {
  const { renderCertificateReadyEmail } = await import("@/src/features/email/renderAttendeeEmail");
  const rendered = await renderCertificateReadyEmail({
    certificate,
    organizerName: opts?.organizerName || "Organizer",
    viewerUrl,
    verifyUrl,
    driveShareUrl: opts?.driveShareUrl,
    includeDriveLink: opts?.includeDriveLink,
  });
  return { subject: rendered.subject, html: rendered.html, text: rendered.text };
}

/** Pure helper for tests — when Drive link may appear in email. */
export function shouldIncludeDriveLinkInEmail(opts: {
  includeDriveLink: boolean;
  driveShareUrl?: string | null;
}): boolean {
  return Boolean(opts.includeDriveLink && String(opts.driveShareUrl || "").trim());
}
