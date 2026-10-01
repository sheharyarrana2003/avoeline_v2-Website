/**
 * The one way this app sends mail.
 *
 * Brevo over plain `fetch` — no SDK, matching what the registration email
 * already did. That call site is now the first caller of this rather than a
 * second copy of the same request.
 *
 * Server-only: it reads BREVO_API_KEY. Never import from a Client Component.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Brevo caps messageVersions at 1000 per request. Chunking at that boundary
 * keeps a 5,000-attendee send to five calls rather than five thousand.
 */
const MAX_VERSIONS_PER_CALL = 1000;

export type Recipient = { email: string; name?: string };

export type EmailMessage = {
    subject: string;
    html: string;
    text?: string;
    /** Display name on the From line. The address is always MAIL_FROM — see below. */
    senderName?: string;
    replyTo?: Recipient;
};

export type SendOutcome = { sent: number; failed: number; skipped: boolean };

/**
 * Per-recipient overrides for a bulk send.
 *
 * Certificate distribution is the reason this exists: everyone gets the same
 * letter but their own verification link, so one shared `htmlContent` cannot
 * work. Brevo's messageVersions take a `subject` and `htmlContent` of their
 * own, so a personalised batch is still one request per 1000 people rather
 * than one request per person.
 */
export type BulkOptions = {
    personalize?: (recipient: Recipient) => { subject?: string; html?: string; text?: string };
};

/** Escape anything user-supplied before it goes into an HTML body. */
export function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Sender identity is always MAIL_FROM with the organizer's name as the display
 * name, never the organizer's own address: mail claiming their domain but
 * leaving Brevo's servers fails SPF/DKIM alignment. Their real address goes
 * behind the reply button instead.
 */
function senderFor(from: string, senderName?: string) {
    return { email: from, name: senderName ? `${senderName} (via Avoeline)` : "Avoeline" };
}

async function post(body: unknown, apiKey: string, label: string): Promise<boolean> {
    try {
        const response = await fetch(BREVO_ENDPOINT, {
            method: "POST",
            headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            // Brevo's body carries the reason. An unverified sender and the daily
            // quota are the two that actually happen, and both are silent otherwise.
            console.error(`[${label}] Brevo rejected the send (${response.status})`, await response.text().catch(() => ""));
            return false;
        }
        return true;
    } catch (err) {
        console.error(`[${label}] Brevo request failed`, err);
        return false;
    }
}

/** One message to one recipient. Never throws; returns false if nothing was sent. */
export async function sendEmail(to: Recipient, message: EmailMessage, _unused?: unknown): Promise<boolean> {
    const apiKey = process.env.BREVO_API_KEY;
    const from = process.env.MAIL_FROM;

    if (!looksLikeEmail(to.email)) {
        console.warn("[sendEmail] refusing an invalid recipient address");
        return false;
    }
    if (!apiKey || !from) {
        console.info(`[sendEmail] no BREVO_API_KEY/MAIL_FROM — not sending. Would have sent to ${to.email}: ${message.subject}`);
        return false;
    }

    return post(
        {
            sender: senderFor(from, message.senderName),
            to: [{ email: to.email, name: to.name || undefined }],
            ...(message.replyTo ? { replyTo: { email: message.replyTo.email, name: message.replyTo.name || undefined } } : {}),
            subject: message.subject,
            htmlContent: message.html,
            ...(message.text ? { textContent: message.text } : {}),
        },
        apiKey,
        "sendEmail",
    );
}

/**
 * One message to many recipients — certificate distribution, an event
 * broadcast, a batch of invitations. Pass `personalize` when each person needs
 * their own body.
 *
 * Uses Brevo's `messageVersions` rather than putting everyone in one `to` array.
 * That is not an optimisation, it is the point: a shared `to` header discloses
 * every attendee's address to every other attendee, which for an event's
 * registrant list is a data leak with a name on it. Each version carries exactly
 * one recipient.
 *
 * Never throws. Invalid and duplicate addresses are dropped before sending, so
 * one bad row cannot fail the batch, and a chunk that Brevo rejects is counted
 * as failed while the remaining chunks still go.
 */
export async function sendBulkEmail(
    recipients: Recipient[],
    message: EmailMessage,
    options: BulkOptions = {},
): Promise<SendOutcome> {
    const apiKey = process.env.BREVO_API_KEY;
    const from = process.env.MAIL_FROM;

    const seen = new Set<string>();
    const clean = recipients.filter((r) => {
        const email = String(r?.email ?? "").trim().toLowerCase();
        if (!looksLikeEmail(email) || seen.has(email)) return false;
        seen.add(email);
        return true;
    });

    if (!clean.length) return { sent: 0, failed: 0, skipped: false };
    if (!apiKey || !from) {
        console.info(`[sendBulkEmail] no BREVO_API_KEY/MAIL_FROM — not sending to ${clean.length} recipient(s): ${message.subject}`);
        return { sent: 0, failed: 0, skipped: true };
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < clean.length; i += MAX_VERSIONS_PER_CALL) {
        const chunk = clean.slice(i, i + MAX_VERSIONS_PER_CALL);
        const ok = await post(
            {
                sender: senderFor(from, message.senderName),
                // Brevo requires a top-level `to`; each messageVersion overrides it.
                to: [{ email: chunk[0].email, name: chunk[0].name || undefined }],
                ...(message.replyTo ? { replyTo: { email: message.replyTo.email, name: message.replyTo.name || undefined } } : {}),
                subject: message.subject,
                htmlContent: message.html,
                ...(message.text ? { textContent: message.text } : {}),
                messageVersions: chunk.map((r) => {
                    // The top-level subject and body above are the fallback; a
                    // version only overrides what `personalize` actually returns.
                    const own = options.personalize?.(r);
                    return {
                        to: [{ email: r.email, name: r.name || undefined }],
                        ...(own?.subject ? { subject: own.subject } : {}),
                        ...(own?.html ? { htmlContent: own.html } : {}),
                        ...(own?.text ? { textContent: own.text } : {}),
                    };
                }),
            },
            apiKey,
            "sendBulkEmail",
        );
        if (ok) sent += chunk.length;
        else failed += chunk.length;
    }

    return { sent, failed, skipped: false };
}
