import { parseScheduleDateTime } from "@/src/lib/datetime";
import type { EventAccess, EventVisibility } from "@/src/services/models/event.model";

/**
 * Event access and visibility.
 *
 * Client-safe: the access settings form and the code-entry field both import
 * from here, so this file must never reach `adminDb`. Reads live in
 * access.service.ts, writes in actions/.
 */

/**
 * The five models the spec asks for.
 *
 * Aliased from the model rather than restated, so the union cannot drift from
 * the type of the field it is stored in.
 */
export type EventAccessType = EventVisibility;

export const ACCESS_TYPES: EventAccessType[] = ["public", "private", "invite_only", "hybrid", "tiered"];

export function isAccessType(value: unknown): value is EventAccessType {
    return typeof value === "string" && (ACCESS_TYPES as string[]).includes(value);
}

/** Human labels, and what each one actually does, for the organizer's selector. */
export const ACCESS_TYPE_META: Record<EventAccessType, { label: string; description: string }> = {
    public: { label: "Public", description: "Listed on Browse Events and searchable. Anyone can view and register." },
    private: { label: "Private", description: "Not listed anywhere. Reachable by direct link, and gated by an access code or the email whitelist if you set one." },
    invite_only: { label: "Invite only", description: "Not listed. Each invitee gets their own link, which you can expire or limit to a single use." },
    hybrid: { label: "Hybrid", description: "Publicly listed and open to register, with the tiers you choose gated behind the code or whitelist." },
    tiered: { label: "VIP / Tiered", description: "Publicly listed. Every attendee is assigned a tier, and the agenda they see depends on it." },
};

/** The spec's starting tiers. Editable per event, so this is only the default. */
export const DEFAULT_ATTENDEE_TIERS = ["General", "Premium", "VIP", "Speaker", "Sponsor"];

export type { EventAccess } from "@/src/services/models/event.model";

export function defaultEventAccess(): EventAccess {
    return {
        attendeeTiers: [...DEFAULT_ATTENDEE_TIERS],
        gatedTiers: [],
        allowTierSelfSelect: false,
        requiresApproval: false,
        waitlistEnabled: false,
    };
}

/**
 * One row of an event's guest list.
 *
 * A whitelist entry and a unique invite link are the same record with different
 * strictness, so they share a collection rather than duplicating the
 * open/registered tracking twice: a `whitelist` row authorizes an email address,
 * an `invite` row authorizes one unguessable token.
 */
export interface EventInvite {
    id: string;
    eventId: string;
    /** Always lowercased on write, so matching is not case-sensitive. */
    email: string;
    name: string;
    kind: "whitelist" | "invite";
    /** Unguessable, `invite` rows only. Never rendered for whitelist rows. */
    token: string | null;
    /** Tier this person gets on registration; "" means the event default. */
    tier: string;
    /** Spec 2.2: track whether the link was opened, and whether they registered. */
    openedAt: string | null;
    registeredAt: string | null;
    registrationId: string | null;
    /** DD/MM/YYYY, per the house date contract. Compared via parseScheduleDateTime. */
    expiresAt: string;
    singleUse: boolean;
    createdAt: string | null;
}

/** Lowercased and trimmed. The one place email normalization happens. */
export function normalizeEmail(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

export function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Why an invite cannot be used right now, or null if it can.
 *
 * Expiry is compared through parseScheduleDateTime because the stored value is
 * DD/MM/YYYY and string comparison on that is meaningless. The time is pinned to
 * the end of the day, since an expiry *date* should last all of that date.
 */
export function inviteRefusal(invite: EventInvite): "expired" | "already_used" | null {
    if (invite.expiresAt) {
        const deadline = parseScheduleDateTime(invite.expiresAt, "11:59 PM");
        if (deadline && deadline.getTime() < Date.now()) return "expired";
    }
    if (invite.singleUse && invite.registeredAt) return "already_used";
    return null;
}

/** Row of a parsed guest-list upload, before anything is written. */
export type ParsedGuest = { email: string; name: string; tier: string };

export type GuestListReport = {
    valid: ParsedGuest[];
    /** Malformed addresses, with the line they came from. */
    invalid: { line: number; value: string }[];
    /** Addresses repeated within the upload itself. */
    duplicates: string[];
};

/**
 * Read a pasted or uploaded guest list, and say what is wrong with it before
 * anything is saved (spec 2.2: "with duplicate and invalid-email detection
 * before saving").
 *
 * Accepts CSV or one address per line, with or without a header row, and takes
 * `email,name,tier` when the extra columns are there. Hand-rolled rather than
 * pulling in a parser: the writing half in `src/lib/csv.ts` is already
 * hand-rolled for the same reason, and reading a flat address list needs quoted
 * fields and nothing else.
 */
export function parseGuestList(text: string): GuestListReport {
    const valid: ParsedGuest[] = [];
    const invalid: { line: number; value: string }[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();

    // Strip a UTF-8 BOM, or the first header cell never matches "email".
    const lines = String(text ?? "").replace(/^﻿/, "").split(/\r\n|\r|\n/);

    lines.forEach((raw, index) => {
        const line = raw.trim();
        if (!line) return;

        const cells = splitCsvLine(line);
        const first = normalizeEmail(cells[0]);

        // A header row only counts as one if its first cell is not itself an
        // address -- a list that happens to start with "email@..." is data.
        if (index === 0 && !looksLikeEmail(first) && /e-?mail/i.test(first)) return;

        if (!looksLikeEmail(first)) {
            invalid.push({ line: index + 1, value: line.slice(0, 80) });
            return;
        }
        if (seen.has(first)) {
            duplicates.push(first);
            return;
        }
        seen.add(first);
        valid.push({ email: first, name: (cells[1] ?? "").trim(), tier: (cells[2] ?? "").trim() });
    });

    return { valid, invalid, duplicates };
}

/** One CSV record into cells, honouring quotes and doubled quotes. */
function splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (quoted) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    cell += '"';
                    i += 1;
                } else {
                    quoted = false;
                }
            } else {
                cell += ch;
            }
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === "," || ch === ";" || ch === "\t") {
            cells.push(cell);
            cell = "";
        } else {
            cell += ch;
        }
    }
    cells.push(cell);
    return cells.map((c) => c.trim());
}


/* --------------------------------------------------- the access rule, pure */

export type AccessDenial =
    | "not_found"
    | "closed"
    | "needs_code"
    | "bad_code"
    | "needs_invite"
    | "invite_expired"
    | "invite_used"
    | "not_whitelisted";

export type AccessDecision =
    | {
          allowed: true;
          /** Whether this event belongs on Browse Events. */
          listed: boolean;
          /** Tier the visitor is entitled to; "" when the event decides. */
          tier: string;
          /** Tiers still behind the code/guest-list gate (hybrid only). */
          lockedTiers: string[];
      }
    | { allowed: false; reason: AccessDenial };

/** Everything the rule needs, once the I/O has been done. */
export type AccessFacts = {
    type: EventAccessType;
    /** From eventLifecycle -- a finished or cancelled event admits nobody. */
    open: boolean;
    /** Whether the organizer set an access code at all. */
    hasCode: boolean;
    /** Whether the code the visitor submitted matches it. */
    codeMatches: boolean;
    /** Whether the visitor submitted a code (to tell "missing" from "wrong"). */
    codeSubmitted: boolean;
    /** A valid, unexpired, unused guest-list row for this event, if any. */
    entry: Pick<EventInvite, "kind" | "tier"> | null;
    /** Whether the visitor's email is known yet (only true at registration). */
    emailKnown: boolean;
    /** Whether the event restricts registration to a guest list at all. */
    guestListInUse: boolean;
    gatedTiers: string[];
};

/**
 * May this visitor see, or register for, this event?
 *
 * Pure, so the rule can be asserted directly -- it is the one piece of this
 * module where a mistake leaks a private event. The service does the reads and
 * hands the answers in.
 *
 * The rule the spec describes is three alternative ways in, not three
 * requirements: a direct link, a whitelisted address, or a valid code. Which is
 * why a private event is *viewable* by link and gated at the point of
 * registering, when an email finally exists to check.
 */
export function decideAccess(facts: AccessFacts): AccessDecision {
    if (!facts.open) return { allowed: false, reason: "closed" };

    const listed = facts.type === "public" || facts.type === "hybrid" || facts.type === "tiered";
    const tier = facts.entry?.tier ?? "";

    switch (facts.type) {
        case "public":
        case "tiered":
            return { allowed: true, listed, tier, lockedTiers: [] };

        case "hybrid":
            // Open to everyone; only the gated tiers need the code or guest list.
            return {
                allowed: true,
                listed,
                tier,
                lockedTiers: facts.codeMatches || facts.entry ? [] : [...facts.gatedTiers],
            };

        case "invite_only":
            if (!facts.entry) return { allowed: false, reason: "needs_invite" };
            return { allowed: true, listed: false, tier, lockedTiers: [] };

        case "private": {
            // A code, when set, is mandatory for everyone except the holder of a
            // valid invite -- their token is a stronger claim than the code.
            if (facts.hasCode && !facts.codeMatches && facts.entry?.kind !== "invite") {
                return { allowed: false, reason: facts.codeSubmitted ? "bad_code" : "needs_code" };
            }
            // The guest list restricts who may REGISTER, so it can only be
            // enforced once an email is known.
            if (facts.emailKnown && facts.guestListInUse && !facts.entry) {
                return { allowed: false, reason: "not_whitelisted" };
            }
            return { allowed: true, listed: false, tier, lockedTiers: [] };
        }
    }
}
