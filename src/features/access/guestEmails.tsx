import { escapeHtml } from "@/src/lib/email";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";

export async function sendInviteEmail(
  organizerId: string,
  to: string,
  eventTitle: string,
  url: string,
) {
  const title = escapeHtml(eventTitle);
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject: `You are invited to ${eventTitle}`,
    html: `<p>You have been invited to <strong>${title}</strong>.</p><p><a href="${escapeHtml(url)}">Open your personal invitation</a> to register.</p>`,
    text: `You have been invited to ${eventTitle}. Register: ${url}`,
  });
}

export async function sendWhitelistEmail(
  organizerId: string,
  to: string,
  eventTitle: string,
  url: string,
) {
  const title = escapeHtml(eventTitle);
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject: `You are on the list for ${eventTitle}`,
    html: `<p>Your email has been added to the guest list for <strong>${title}</strong>.</p><p><a href="${escapeHtml(url)}">Register</a> using the same address.</p>`,
    text: `You're on the list for ${eventTitle}. Register: ${url}`,
  });
}
