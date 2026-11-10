import { Registration, CommunicationLog } from "@/src/services/models/reg.type";
import { EventModel } from "@/src/services/models/event.model";
import { escapeHtml } from "@/src/lib/email";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";
import { assertOrganizerDriveAndGmail } from "@/src/features/connections/server/assertOrganizerDriveAndGmail";
import { generateQrPng } from "./qr";
import { buildRegistrationEmail, type TeamMemberMailRow } from "./registrationEmail.logic";

export { buildRegistrationEmail, type TeamMemberMailRow };

/**
 * Send registration confirmation via organizer Gmail only (fail closed — no Resend).
 */
export async function sendRegistrationEmail(
  registration: Registration,
  event: EventModel,
  ticketUrl: string,
  opts?: { teamMembers?: TeamMemberMailRow[] },
): Promise<CommunicationLog | null> {
  const to = registration.attendee?.email;
  if (!to) {
    console.warn("[sendRegistrationEmail] registration has no attendee email; nothing to send");
    return null;
  }

  const gate = await assertOrganizerDriveAndGmail(event.organizerId);
  if (!gate.ok) {
    console.warn("[sendRegistrationEmail] blocked", gate.code, gate.error);
    return null;
  }

  let qrImageSrc: string | null = null;
  let qrAttachment: { filename: string; content: Buffer; contentType: string } | undefined;
  if (registration.qrCode?.data) {
    try {
      // N4: qrCode.data is the opaque check-in token (not PII JSON).
      const png = await generateQrPng(String(registration.qrCode.data));
      qrImageSrc = `data:image/png;base64,${png.toString("base64")}`;
      qrAttachment = {
        filename: "ticket-qr.png",
        content: png,
        contentType: "image/png",
      };
    } catch (err) {
      console.error("[sendRegistrationEmail] qr render", err);
    }
  }

  const { subject, html, text } = buildRegistrationEmail(registration, event, ticketUrl, {
    teamMembers: opts?.teamMembers,
    qrImageSrc,
  });

  const result = await sendViaOrganizerConnection({
    organizerId: event.organizerId,
    to,
    subject,
    html,
    text,
    kind:
      registration.status === "awaiting_payment"
        ? "registration_received"
        : "registration_confirmed",
    eventId: event.id,
    ...(qrAttachment ? { attachments: [qrAttachment] } : {}),
  });

  if (!result.ok) {
    console.warn("[sendRegistrationEmail] send failed", result.code, result.error);
    return null;
  }

  return {
    type: "registration_confirmation",
    sentAt: new Date().toISOString(),
    channel: "email",
    status: "sent",
  };
}

export async function sendAccessCodeEmail(
  registration: Registration,
  event: EventModel,
  code: string,
  enterUrl: string,
): Promise<CommunicationLog | null> {
  const to = registration.attendee?.email;
  if (!to) return null;

  const gate = await assertOrganizerDriveAndGmail(event.organizerId);
  if (!gate.ok) {
    console.warn("[sendAccessCodeEmail] blocked", gate.code);
    return null;
  }

  const name = registration.attendee?.name || "there";
  const subject = `Your access code — ${event.title}`;
  const text = [
    `Hi ${name},`,
    "",
    `Your place at ${event.title} is confirmed. Enter this code to open the participant dashboard:`,
    "",
    code,
    "",
    enterUrl,
    "",
    "This is your team's login code. Anyone on the team can use it.",
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Your place at <strong>${escapeHtml(event.title)}</strong> is confirmed. Enter this team code to open the participant dashboard:</p>
<p style="font-size:22px;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.08em">${escapeHtml(code)}</p>
<p><a href="${escapeHtml(enterUrl)}">Enter your code</a></p>
<p>This is your team's login code. Anyone on the team can use it.</p>`;

  const result = await sendViaOrganizerConnection({
    organizerId: event.organizerId,
    to,
    subject,
    html,
    text,
    kind: "registration_confirmed",
    eventId: event.id,
  });
  if (!result.ok) return null;
  return {
    type: "registration_confirmation",
    sentAt: new Date().toISOString(),
    channel: "email",
    status: "sent",
  };
}
