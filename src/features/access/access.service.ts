import { cache } from "react";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
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

type InviteRow = {
  id: string;
  event_id: string;
  email: string;
  name: string | null;
  kind: string | null;
  token: string | null;
  tier: string | null;
  opened_at: string | null;
  registered_at: string | null;
  registration_id: string | null;
  expires_at: string | null;
  single_use: boolean | null;
  created_at: string | null;
  extra?: Record<string, unknown> | null;
};

function mapToInvite(raw: InviteRow): EventInvite {
  const kindRaw = raw.kind ?? (raw.extra as { kind?: string } | null)?.kind;
  const extra = (raw.extra as Record<string, unknown> | null) ?? {};
  const revokedRaw = extra.revokedAt ?? extra.revoked_at;
  return {
    id: String(raw.id || ""),
    eventId: String(raw.event_id || ""),
    email: normalizeEmail(raw.email),
    name: String(raw.name || ""),
    kind: kindRaw === "invite" || kindRaw === "invite_link" ? "invite" : "whitelist",
    token: raw.token ? String(raw.token) : null,
    tier: String(raw.tier || ""),
    openedAt: toIsoString(raw.opened_at),
    registeredAt: toIsoString(raw.registered_at),
    registrationId: raw.registration_id ? String(raw.registration_id) : null,
    revokedAt: revokedRaw ? toIsoString(String(revokedRaw)) : null,
    expiresAt: String(raw.expires_at || ""),
    singleUse: !!raw.single_use,
    createdAt: toIsoString(raw.created_at),
  };
}

/** Every guest-list row for an event: whitelist entries and invites together. */
export const getEventGuestList = cache(async (eventId: string): Promise<EventInvite[]> => {
  if (!eventId) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .select("*")
      .eq("event_id", eventId);
    if (error) throw error;
    return (data as InviteRow[]).map(mapToInvite).sort((a, b) => a.email.localeCompare(b.email));
  } catch (err) {
    console.error("[getEventGuestList] read failed", { eventId, err });
    throw new Error(`Failed to read the guest list for ${eventId}`, { cause: err });
  }
});

/**
 * One invite by its token.
 * Queried on the token alone — the token is the secret.
 */
export const findInviteByToken = cache(async (token: string): Promise<EventInvite | null> => {
  const clean = String(token ?? "").trim();
  if (!clean) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .select("*")
      .eq("token", clean)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapToInvite(data as InviteRow) : null;
  } catch (err) {
    console.error("[findInviteByToken] read failed", err);
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

export function accessTypeOf(event: Pick<EventModel, "visibility">): EventAccessType {
  const raw = String(event?.visibility ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "public";
  // Legacy UI id → stored `tiered`
  if (raw === "vip_tiered") return "tiered";
  return isAccessType(raw) ? raw : "private";
}

/** Access types that appear on Browse Events. */
export function isListedPublicly(event: Pick<EventModel, "visibility">): boolean {
  const type = accessTypeOf(event);
  return type === "public" || type === "hybrid" || type === "tiered";
}

export type AccessAttempt = {
  token?: string | null;
  code?: string | null;
  email?: string | null;
  /** Signed httpOnly unlock from a prior valid code (session cookie). */
  unlockToken?: string | null;
};

export async function resolveEventAccess(
  event: EventModel | null,
  attempt: AccessAttempt = {},
): Promise<AccessDecision & { entry: EventInvite | null }> {
  if (!event) return { allowed: false, reason: "not_found", entry: null };

  const type = accessTypeOf(event);
  const requiredCode = String(event.accessCode ?? "").trim();
  const submittedCode = String(attempt.code ?? "").trim();
  const { verifyAccessUnlockToken } = await import("./lib/accessUnlock");
  const unlockedByCookie = verifyAccessUnlockToken(event.id, attempt.unlockToken);

  let entry: EventInvite | null = null;
  if (attempt.token) {
    const invite = await findInviteByToken(String(attempt.token));
    if (invite && invite.eventId === event.id) {
      const refusal = inviteRefusal(invite);
      if (refusal === "revoked") return { allowed: false, reason: "invite_used", entry: null };
      if (refusal === "expired") return { allowed: false, reason: "invite_expired", entry: null };
      if (refusal === "already_used") return { allowed: false, reason: "invite_used", entry: null };
      entry = invite;
    }
  }

  const email = normalizeEmail(attempt.email);
  if (!entry && email) entry = await findGuestEntry(event.id, email);

  const guestListInUse =
    type === "private" && !!email && !entry ? await hasGuestList(event.id) : false;
  const suspended = await UserService.suspendedOrganizerIds();

  const codeMatches = unlockedByCookie || (!!requiredCode && submittedCode === requiredCode);

  const decision = decideAccess({
    type,
    open:
      isActiveLifecycle(eventLifecycle(event.status, event.schedule)) &&
      !suspended.has(String(event.organizerId)),
    hasCode: !!requiredCode,
    codeMatches,
    codeSubmitted: !!submittedCode || unlockedByCookie,
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

/**
 * Bind a registration to an invite after the registration was created for that
 * token. Not a Server Action — only call from the registration success path.
 */
export async function markInviteRegistered(
  token: string,
  registrationId: string,
): Promise<boolean> {
  if (!token || !registrationId) return false;
  try {
    const cleanToken = token.trim();
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .select("id, registration_id, extra")
      .eq("token", cleanToken)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return false;
    // Refuse rebinding an invite that already points at a different registration.
    if (data.registration_id && String(data.registration_id) !== registrationId) return false;

    const extra = (data.extra as Record<string, unknown> | null) ?? {};
    const { error: updErr } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .update({
        registered_at: new Date().toISOString(),
        registration_id: registrationId,
        updated_at: new Date().toISOString(),
        extra: { ...extra, status: "registered" },
      })
      .eq("id", data.id)
      .eq("token", cleanToken);
    if (updErr) throw updErr;
    return true;
  } catch (err) {
    console.error("[markInviteRegistered]", err instanceof Error ? err.message : err);
    return false;
  }
}
