import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";
import { renderAccessInviteEmail } from "@/src/features/email/renderAttendeeEmail";

export type GuestAccessEmailOpts = {
  subject?: string;
  body?: string;
  /** For audit + limits on organizer transport */
  eventId?: string;
  organizerName?: string;
};

export async function sendInviteEmail(
  organizerId: string,
  to: string,
  eventTitle: string,
  url: string,
  opts?: GuestAccessEmailOpts,
) {
  const subject = (opts?.subject?.trim() || `You are invited to ${eventTitle}`).slice(0, 200);
  const rendered = await renderAccessInviteEmail({
    mode: "invite",
    organizerName: opts?.organizerName || "Organizer",
    eventTitle,
    inviteUrl: url,
    subject,
    bodyPlain: opts?.body,
  });
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
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
  const subject = (opts?.subject?.trim() || `You are on the list for ${eventTitle}`).slice(0, 200);
  const rendered = await renderAccessInviteEmail({
    mode: "whitelist",
    organizerName: opts?.organizerName || "Organizer",
    eventTitle,
    inviteUrl: url,
    subject,
    bodyPlain: opts?.body,
  });
  return sendViaOrganizerConnection({
    organizerId,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    kind: "access_whitelist",
    eventId: opts?.eventId ?? null,
  });
}
