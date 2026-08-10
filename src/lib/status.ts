/**
 * One meaning per status, for the whole app.
 *
 * This replaces roughly two dozen local status maps that contradicted each
 * other. "confirmed" rendered seven different ways depending on the page --
 * grey on the quotes list, green on the booking card, solid black on the vendor
 * bookings list -- and on the events page `registration_open` and `cancelled`
 * were styled identically in rose, so a healthy event and a dead one looked the
 * same.
 *
 * The tone is the whole point: colour has to mean something consistently.
 *   success  green  - it worked, it's done, it's live
 *   danger   red    - it failed, it was cancelled, it was undone
 *   warning  amber  - waiting on somebody, usually the person reading this
 *   info     sky    - in flight, mid-negotiation, nothing wrong
 *   neutral  grey   - not started, archived, or unknown
 */

export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

export type StatusMeta = { label: string; tone: StatusTone };

/**
 * Labels are Title Case here and shouted by the badge's `uppercase` class, so
 * casing stays a styling decision rather than something baked into the data.
 */
const STATUS: Record<string, StatusMeta> = {
    // ── Quotes and bookings ──────────────────────────────────────────────
    quote_requested: { label: "Quote requested", tone: "warning" },
    quote_sent: { label: "Quote sent", tone: "info" },
    quote_received: { label: "Quote received", tone: "info" },
    quote_accepted: { label: "Accepted", tone: "success" },
    negotiating: { label: "Negotiating", tone: "info" },
    confirmed: { label: "Confirmed", tone: "success" },
    in_progress: { label: "In progress", tone: "info" },
    completed: { label: "Completed", tone: "success" },
    cancelled: { label: "Cancelled", tone: "danger" },
    declined: { label: "Declined", tone: "danger" },
    rejected: { label: "Rejected", tone: "danger" },
    pending: { label: "Pending", tone: "warning" },

    // ── Events ───────────────────────────────────────────────────────────
    draft: { label: "Draft", tone: "neutral" },
    published: { label: "Published", tone: "success" },
    registration_open: { label: "Registration open", tone: "success" },
    registration_closed: { label: "Registration closed", tone: "neutral" },
    ongoing: { label: "Ongoing", tone: "info" },

    // ── Registrations and attendance ─────────────────────────────────────
    checked_in: { label: "Checked in", tone: "success" },
    attended: { label: "Attended", tone: "success" },
    no_show: { label: "No show", tone: "danger" },
    awaiting_payment: { label: "Awaiting payment", tone: "warning" },

    // ── Payments ─────────────────────────────────────────────────────────
    paid: { label: "Paid", tone: "success" },
    unpaid: { label: "Unpaid", tone: "warning" },
    refunded: { label: "Refunded", tone: "danger" },
    failed: { label: "Failed", tone: "danger" },

    // ── Certificates ─────────────────────────────────────────────────────
    generating: { label: "Generating", tone: "warning" },
    ready: { label: "Ready", tone: "info" },
    issued: { label: "Issued", tone: "success" },
    revoked: { label: "Revoked", tone: "danger" },
    success: { label: "Success", tone: "success" },
    missing: { label: "Missing", tone: "neutral" },
};

/** "quote_requested" -> "Quote requested", for statuses not in the map. */
function humanize(raw: string): string {
    const words = raw.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * Look up a status. Unknown values degrade to a neutral badge with a
 * readable label rather than disappearing or throwing -- Firestore holds
 * statuses written by systems outside this repo.
 */
export function statusMeta(status: string | null | undefined): StatusMeta {
    if (!status) return { label: "Unknown", tone: "neutral" };
    const key = String(status).toLowerCase().replace(/\s+/g, "_");
    return STATUS[key] ?? { label: humanize(String(status)), tone: "neutral" };
}
