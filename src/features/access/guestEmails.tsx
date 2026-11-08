import { escapeHtml } from "@/src/lib/email";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";

function paragraphsFromPlaintext(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
}

export type GuestAccessEmailOpts = {
  subject?: string;
  body?: string;
  /** For audit + limits on organizer transport */
  eventId?: string;
};

export async function sendInviteEmail(
  organizerId: string,
  to: string,
  eventTitle: string,
  url: string,
  opts?: GuestAccessEmailOpts,
) {
  const title = escapeHtml(eventTitle);
  const subject = (opts?.subject?.trim() || `You are invited to ${eventTitle}`).slice(0, 200);
  const custom = (opts?.body || "").trim();
  const html = custom
    ? `${paragraphsFromPlaintext(custom)}<p><a href="${escapeHtml(url)}">Open your personal invitation</a> to register.</p>`
    : `<p>You have been invited to <strong>${title}</strong>.</p><p><a href="${escapeHtml(url)}">Open your personal invitation</a> to register.</p>`;
  const text = custom
    ? `${custom}\n\nRegister: ${url}`
    : `You have been invited to ${eventTitle}. Register: ${url}`;
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject,
    html,
    text,
    kind: "access_invite",
    eventId: opts?.eventId ?? null,
  });
}

export async function sendWhitelistEmail(
  organizerId: string,
  to: string,
  eventTitle: string,
  url: string,
  opts?: GuestAccessEmailOpts,
) {
  const title = escapeHtml(eventTitle);
  const subject = (opts?.subject?.trim() || `You are on the list for ${eventTitle}`).slice(0, 200);
  const custom = (opts?.body || "").trim();
  const html = custom
    ? `${paragraphsFromPlaintext(custom)}<p><a href="${escapeHtml(url)}">Register</a> using this email address.</p>`
    : `<p>Your email has been added to the guest list for <strong>${title}</strong>.</p><p><a href="${escapeHtml(url)}">Register</a> using the same address.</p>`;
  const text = custom
    ? `${custom}\n\nRegister: ${url}`
    : `You're on the list for ${eventTitle}. Register: ${url}`;
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject,
    html,
    text,
    kind: "access_whitelist",
    eventId: opts?.eventId ?? null,
  });
}
