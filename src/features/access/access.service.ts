import { cache } from "react";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { UserService } from "@/src/services/user.service";
import { toIsoString } from "@/src/lib/datetime";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import type { EventModel } from "@/src/services/models/event.model";
import {
    decideAccess,
    inviteRefusal,
    isAccessType,
    normalizeEmail,
    type AccessDecision,
    type EventAccessType,
    type EventInvite,
} from "./types";

/* ---------------------------------------------------------------- reads */

function mapToInvite(raw: any, id: string): EventInvite {
    return {
        id: String(raw?.id || id || ""),
        eventId: String(raw?.eventId || ""),
        email: normalizeEmail(raw?.email),
        name: String(raw?.name || ""),
        kind: raw?.kind === "invite" ? "invite" : "whitelist",
        token: raw?.token ? String(raw.token) : null,
        tier: String(raw?.tier || ""),
        openedAt: toIsoString(raw?.openedAt),
        registeredAt: toIsoString(raw?.registeredAt),
        registrationId: raw?.registrationId ? String(raw.registrationId) : null,
        expiresAt: String(raw?.expiresAt || ""),
        singleUse: !!raw?.singleUse,
        createdAt: toIsoString(raw?.createdAt),
    };
}

/** Every guest-list row for an event: whitelist entries and invites together. */
export const getEventGuestList = cache(async (eventId: string): Promise<EventInvite[]> => {
    if (!eventId) return [];
    try {
        const snap = await adminDb.collection(COLLECTIONS.EVENT_INVITES).where("eventId", "==", eventId).get();
        return snap.docs
            .map((d: QueryDocumentSnapshot) => mapToInvite(d.data(), d.id))
            .sort((a: EventInvite, b: EventInvite) => a.email.localeCompare(b.email));
    } catch (err) {
        console.error("[getEventGuestList] Firestore read failed", { eventId, err });
        throw new Error(`Failed to read the guest list for ${eventId}`, { cause: err });
    }
});

/**
 * One invite by its token.
 *
 * Queried on the token alone rather than token + eventId: the token is the
 * secret, so a caller who has it does not also need to prove which event it
 * belongs to, and checking the pair would let a wrong eventId masquerade as an
 * invalid token.
 */
export const findInviteByToken = cache(async (token: string): Promise<EventInvite | null> => {
    const clean = String(token ?? "").trim();
    if (!clean) return null;
    try {
        const snap = await adminDb
            .collection(COLLECTIONS.EVENT_INVITES)
            .where("token", "==", clean)
            .limit(1)
            .get();
        return snap.empty ? null : mapToInvite(snap.docs[0].data(), snap.docs[0].id);
    } catch (err) {
        console.error("[findInviteByToken] Firestore read failed", err);
        throw new Error("Failed to look up that invite", { cause: err });
    }
});

/** The guest-list row for one address on one event, or null. */
export async function findGuestEntry(eventId: string, email: string): Promise<EventInvite | null> {
    const clean = normalizeEmail(email);
    if (!eventId || !clean) return null;
    const list = await getEventGuestList(eventId);
    return list.find((entry) => entry.email === clean) ?? null;
}

/* ------------------------------------------------------- the access rule */

/**
 * How an event's `visibility` field is read.
 *
 * A MISSING value stays `public`, which is what the previous read-mapper did and
 * what every event created before access types existed relies on -- the wizard
 * has always written the field, so an absent one means a legacy or seeded
 * document rather than an intention to hide. An UNRECOGNISED value reads as
 * `private`: a typo or a tampered field must not resolve to the open setting.
 */
export function accessTypeOf(event: Pick<EventModel, "visibility">): EventAccessType {
    const raw = String(event?.visibility ?? "").trim().toLowerCase();
    if (!raw) return "public";
    return isAccessType(raw) ? raw : "private";
}

/** Access types that appear on Browse Events. */
export function isListedPublicly(event: Pick<EventModel, "visibility">): boolean {
    const type = accessTypeOf(event);
    return type === "public" || type === "hybrid" || type === "tiered";
}

export type AccessAttempt = {
    /** From `?invite=` on the event URL. */
    token?: string | null;
    /** A code the visitor submitted. */
    code?: string | null;
    /**
     * Only known at registration time, so the guest list is enforced then rather
     * than on page view -- a stranger following a private link has not told us
     * who they are yet.
     */
    email?: string | null;
};

/**
 * Gather the facts, then apply the rule.
 *
 * The one place access is decided. Every entry point -- the public event page,
 * the registration action, Browse Events -- comes through here, because the rule
 * used to be inlined in `getPublicEvent` as `visibility !== "public" → null`,
 * which denied private and invite-only events even to the people holding their
 * link. The rule itself is `decideAccess`, kept pure and asserted separately.
 */
export async function resolveEventAccess(
    event: EventModel | null,
    attempt: AccessAttempt = {},
): Promise<AccessDecision & { entry: EventInvite | null }> {
    if (!event) return { allowed: false, reason: "not_found", entry: null };

    const type = accessTypeOf(event);
    const requiredCode = String(event.accessCode ?? "").trim();
    const submittedCode = String(attempt.code ?? "").trim();

    // An invite token is checked for every access type: it is the strongest
    // claim anyone can present, and it carries a tier.
    // A token that resolves to nothing, or to another event, simply leaves
    // `entry` null -- which is already a refusal for invite_only and irrelevant
    // for the rest, so it needs no separate flag.
    let entry: EventInvite | null = null;
    if (attempt.token) {
        const invite = await findInviteByToken(String(attempt.token));
        if (invite && invite.eventId === event.id) {
            const refusal = inviteRefusal(invite);
            if (refusal === "expired") return { allowed: false, reason: "invite_expired", entry: null };
            if (refusal === "already_used") return { allowed: false, reason: "invite_used", entry: null };
            entry = invite;
        }
    }

    const email = normalizeEmail(attempt.email);
    if (!entry && email) entry = await findGuestEntry(event.id, email);

    // Only read the guest list when the answer can change the outcome.
    const guestListInUse = type === "private" && !!email && !entry ? await hasGuestList(event.id) : false;

    // The other of the two choke points. A suspended organizer's event stops
    // resolving for anybody, so a direct link 404s exactly as an unpublished
    // one does rather than quietly still working.
    const suspended = await UserService.suspendedOrganizerIds();

    const decision = decideAccess({
        type,
        open:
            isActiveLifecycle(eventLifecycle(event.status, event.schedule)) &&
            !suspended.has(String(event.organizerId)),
        hasCode: !!requiredCode,
        codeMatches: !!requiredCode && submittedCode === requiredCode,
        codeSubmitted: !!submittedCode,
        entry,
        emailKnown: !!email,
        guestListInUse,
        gatedTiers: event.access?.gatedTiers ?? [],
    });

    return { ...decision, entry: decision.allowed ? entry : null };
}

/** Whether an event restricts registration to a guest list at all. */
export async function hasGuestList(eventId: string): Promise<boolean> {
    const list = await getEventGuestList(eventId);
    return list.length > 0;
}
