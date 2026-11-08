import { Registration } from "@/src/services/models/reg.type";
import { EventModel } from "@/src/services/models/event.model";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type TeamMemberMailRow = {
  name: string;
  email: string;
  registrationId: string;
  ticketUrl: string;
  isLead?: boolean;
};

/**
 * The confirmation email an attendee receives, as subject plus both bodies.
 */
export function buildRegistrationEmail(
  registration: Registration,
  event: EventModel,
  ticketUrl: string,
  opts?: {
    teamMembers?: TeamMemberMailRow[];
    /** Inline data-URL or https image for the lead QR (Drive links are not embeddable). */
    qrImageSrc?: string | null;
  },
): { subject: string; html: string; text: string } {
  const name = registration.attendee?.name || "there";
  const when = formatDateMedium(event.schedule?.startDate);
  const time = formatTime(event.schedule?.startTime);
  const venue = [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
  const price = formatCurrency(
    registration.finalPrice,
    registration.payment?.currency || "PKR",
    "Free",
  );
  const awaiting = registration.status === "awaiting_payment";
  const members = opts?.teamMembers?.filter(Boolean) ?? [];

  const subject = awaiting
    ? `Registration received — ${event.title}`
    : `You're registered — ${event.title}`;

  const opening = awaiting
    ? `Your place is held while the organiser confirms your payment. We'll be in touch once it's verified.`
    : `Your place is confirmed. Show the QR code below at the entrance.`;

  const facts: Array<[string, string]> = [
    ["Event", event.title],
    ["Date", when],
    ["Starts", time],
    ["Venue", venue || "—"],
    ["Ticket", registration.pricingTier],
    ["Price", price],
    ["Registration ID", registration.registrationId],
  ];

  const memberText = members.length
    ? [
        "",
        "Team:",
        ...members.map(
          (m) =>
            `- ${m.name}${m.email ? ` <${m.email}>` : ""}${m.isLead ? " (lead)" : ""} — ${m.ticketUrl}`,
        ),
      ]
    : [];

  const text = [
    `Hi ${name},`,
    "",
    opening,
    "",
    ...facts.map(([k, v]) => `${k}: ${v}`),
    ...memberText,
    "",
    `Your ticket: ${ticketUrl}`,
    "",
    `Keep that link — it is how you get back to your ticket and QR code.`,
  ].join("\n");

  const qrSrc =
    opts?.qrImageSrc ||
    (registration.qrCode?.imageUrl &&
    !registration.qrCode.imageUrl.startsWith("drive:") &&
    !registration.qrCode.imageUrl.includes("drive.google.com/")
      ? registration.qrCode.imageUrl
      : "");

  const membersHtml = members.length
    ? `<tr><td style="padding:8px 32px 16px">
    <p style="margin:0 0 8px;font-size:14px;font-weight:600">Team</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#404040">
      ${members
        .map(
          (m) =>
            `<li>${escapeHtml(m.name)}${m.isLead ? " (lead)" : ""}${
              m.email ? ` &lt;${escapeHtml(m.email)}&gt;` : ""
            } — <a href="${escapeHtml(m.ticketUrl)}">ticket / QR</a></li>`,
        )
        .join("")}
    </ul>
  </td></tr>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px">
  <tr><td style="padding:32px 32px 8px">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600">${escapeHtml(awaiting ? "Registration received" : "You're registered")}</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#525252">Hi ${escapeHtml(name)}, ${escapeHtml(opening)}</p>
  </td></tr>
  ${
    qrSrc
      ? `<tr><td align="center" style="padding:24px 32px">
    <img src="${escapeHtml(qrSrc)}" width="220" height="220" alt="Entry QR code"
         style="display:block;border:1px solid #e5e5e5;border-radius:12px;background:#ffffff;padding:8px" />
  </td></tr>`
      : ""
  }
  ${membersHtml}
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
    <p style="margin:24px 0 0"><a href="${escapeHtml(ticketUrl)}"
      style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View your ticket</a></p>
    <p style="margin:16px 0 0;font-size:12px;color:#737373">Keep that link — it is how you get back to your ticket and QR code.</p>
  </td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}
