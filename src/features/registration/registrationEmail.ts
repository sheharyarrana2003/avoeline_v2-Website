import { Registration, CommunicationLog } from "@/src/services/models/reg.type";
import { EventModel } from "@/src/services/models/event.model";
import { OrganizerService } from "@/src/services/organizer.service";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** Escape anything user-supplied before it goes into the HTML body. */
function esc(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * The confirmation email an attendee receives, as subject plus both bodies.
 *
 * Split out from the sending so the message can be composed, inspected and logged
 * with no provider configured at all -- which is exactly the state this ships in
 * until a key exists.
 *
 * A plain-text part is built alongside the HTML rather than skipped: HTML-only mail
 * scores worse with spam filters, and some clients still render text by preference.
 */
export function buildRegistrationEmail(
    registration: Registration,
    event: EventModel,
    ticketUrl: string,
): { subject: string; html: string; text: string } {
    const name = registration.attendee?.name || "there";
    const when = formatDateMedium(event.schedule?.startDate);
    const time = formatTime(event.schedule?.startTime);
    const venue = [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
    const price = formatCurrency(registration.finalPrice, registration.payment?.currency || "PKR", "Free");
    const awaiting = registration.status === "awaiting_payment";

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

    const text = [
        `Hi ${name},`,
        "",
        opening,
        "",
        ...facts.map(([k, v]) => `${k}: ${v}`),
        "",
        `Your ticket: ${ticketUrl}`,
        "",
        `Keep that link — it is how you get back to your ticket and QR code.`,
    ].join("\n");

    // Table-based layout with inline styles: mail clients strip <style> blocks and
    // have no flexbox or grid worth relying on.
    const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px">
  <tr><td style="padding:32px 32px 8px">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600">${esc(awaiting ? "Registration received" : "You're registered")}</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#525252">Hi ${esc(name)}, ${esc(opening)}</p>
  </td></tr>
  ${registration.qrCode?.imageUrl
        ? `<tr><td align="center" style="padding:24px 32px">
    <img src="${esc(registration.qrCode.imageUrl)}" width="220" height="220" alt="Entry QR code"
         style="display:block;border:1px solid #e5e5e5;border-radius:12px;background:#ffffff;padding:8px" />
  </td></tr>`
        : ""}
  <tr><td style="padding:8px 32px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px">
      ${facts
          .map(
              ([k, v]) =>
                  `<tr><td style="padding:8px 0;color:#737373;border-bottom:1px solid #f0f0f0">${esc(k)}</td>
                   <td style="padding:8px 0;text-align:right;border-bottom:1px solid #f0f0f0">${esc(v)}</td></tr>`,
          )
          .join("")}
    </table>
    <p style="margin:24px 0 0"><a href="${esc(ticketUrl)}"
      style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View your ticket</a></p>
    <p style="margin:16px 0 0;font-size:12px;color:#737373">Keep that link — it is how you get back to your ticket and QR code.</p>
  </td></tr>
</table>
</body></html>`;

    return { subject, html, text };
}

/**
 * Send the confirmation, via Brevo's HTTP API.
 *
 * Plain `fetch` rather than an SDK: this is one POST, and the repo's rule is no
 * avoidable dependencies. Every provider-specific detail -- the `api-key` header
 * rather than a bearer token, the unwrapped top-level fields, `htmlContent` and
 * `textContent` -- lives here and only here, which is what made swapping providers
 * mid-project cheap.
 *
 * Returns a `CommunicationLog` only when a send genuinely succeeded, so an empty
 * `communications[]` on a registration means no email went out rather than one that
 * silently failed. Never throws: a missing key, a 4xx, an exhausted daily quota or
 * a network failure all degrade to "no email sent". Losing someone's registration
 * because mail is misconfigured would be a far worse outcome than a missing email,
 * and they still hold their ticket URL either way.
 */
export async function sendRegistrationEmail(
    registration: Registration,
    event: EventModel,
    ticketUrl: string,
): Promise<CommunicationLog | null> {
    const apiKey = process.env.BREVO_API_KEY;
    const from = process.env.MAIL_FROM;
    const to = registration.attendee?.email;

    const { subject, html, text } = buildRegistrationEmail(registration, event, ticketUrl);

    if (!to) {
        console.warn("[sendRegistrationEmail] registration has no attendee email; nothing to send");
        return null;
    }
    if (!apiKey || !from) {
        console.info(
            `[sendRegistrationEmail] no BREVO_API_KEY/MAIL_FROM set — not sending. Would have sent to ${to}: ${subject}`,
        );
        return null;
    }

    // Shown as the organizer, sent as us: mail claiming an organizer's own domain but
    // leaving Brevo's servers fails SPF/DKIM alignment. The display name carries who
    // it is from and replyTo puts their real address behind the reply button.
    const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
    const organizerName = organizer?.organization?.name?.trim();
    const organizerEmail = organizer?.contact?.primaryEmail?.trim();

    try {
        const response = await fetch(BREVO_ENDPOINT, {
            method: "POST",
            headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
            body: JSON.stringify({
                sender: { email: from, name: organizerName ? `${organizerName} (via Avoeline)` : "Avoeline" },
                to: [{ email: to, name: registration.attendee?.name || undefined }],
                ...(organizerEmail ? { replyTo: { email: organizerEmail, name: organizerName || undefined } } : {}),
                subject,
                htmlContent: html,
                textContent: text,
            }),
        });

        if (!response.ok) {
            // Body carries Brevo's reason -- unverified sender and daily quota are the
            // two that will actually happen, and both are silent otherwise.
            console.error(
                `[sendRegistrationEmail] Brevo rejected the send (${response.status})`,
                await response.text().catch(() => ""),
            );
            return null;
        }

        return {
            type: "registration_confirmation",
            sentAt: new Date().toISOString(),
            channel: "email",
            status: "sent",
        };
    } catch (err) {
        console.error("[sendRegistrationEmail] send failed", err);
        return null;
    }
}
