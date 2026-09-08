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
    // Waiting on somebody else, like the other warning states. Without this it
    // fell through to humanize() and rendered neutral grey, which reads as
    // "nothing is happening" rather than "you are in a queue".
    waitlisted: { label: "Waitlisted", tone: "warning" },

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

    // ── Event categories and formats ──────────────────────────────
    // A deactivated category is not a failure, so "inactive" is grey rather
    // than red: existing events still use it, it is only hidden from new ones.
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "neutral" },
    approved: { label: "Approved", tone: "success" },

    // -- Hackathon tracks and teams ---------------------------------------
    // "Not submitted" is a warning rather than neutral: a team with an
    // unsubmitted project as the deadline approaches is something the organizer
    // should be able to spot at a glance, not a resting state.
    submitted: { label: "Submitted", tone: "success" },
    not_submitted: { label: "Not submitted", tone: "warning" },
    // A locked roster is the intended end state once the lock date passes, so
    // it reads as information rather than as a problem.
    locked: { label: "Roster locked", tone: "neutral" },
    open: { label: "Roster open", tone: "info" },
    looking: { label: "Looking for members", tone: "info" },
    fee_pending: { label: "Fee pending", tone: "warning" },
    fee_paid: { label: "Fee paid", tone: "success" },
    not_required: { label: "No fee", tone: "neutral" },
    // Judging. "Advanced" and "eliminated" are both settled outcomes, so only
    // the one that ends a team's run reads as negative.
    scored: { label: "Scored", tone: "success" },
    awaiting_scores: { label: "Awaiting scores", tone: "warning" },
    advanced: { label: "Advanced", tone: "success" },
    eliminated: { label: "Eliminated", tone: "danger" },
    judging: { label: "Judging", tone: "info" },
    booked: { label: "Booked", tone: "info" },
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
