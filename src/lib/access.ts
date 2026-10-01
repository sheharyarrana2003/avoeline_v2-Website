import type { EventModel } from "@/src/services/models/event.model";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import type { InviteLinkDoc } from "@/src/features/access/accessEngine.types";

export interface AccessUser {
  email?: string | null;
  userId?: string | null;
  name?: string | null;
}

export interface AccessOptions {
  token?: string | null;
  code?: string | null;
}

export interface AccessResult {
  allowed: boolean;
  reason?:
    | "needs_code"
    | "bad_code"
    | "needs_invite"
    | "invite_expired"
    | "invite_used"
    | "not_whitelisted"
    | "not_found";
  invite?: InviteLinkDoc | null;
}

/**
 * Access gate logic per specification:
 * - public: always true
 * - private: checks whitelistEmails.includes(user.email) OR a valid accessCode was entered this session (or valid token)
 * - invite_only: checks a valid inviteLinks token was used
 * - vip_tiered: defers to registration (anyone can view, tier assigned at registration)
 * - hybrid: returns true for view (tier gating deferred to registration)
 */
export async function checkAccessGate(
  event: EventModel | any | null,
  user?: AccessUser | null,
  options?: AccessOptions | string | null
): Promise<AccessResult> {
  if (!event) {
    return { allowed: false, reason: "not_found" };
  }

  const token = typeof options === "string" ? options : options?.token;
  const code = typeof options === "object" ? options?.code : undefined;

  const rawAccess = event.accessType || (event.visibility === "tiered" ? "vip_tiered" : event.visibility) || "public";
  const accessType = rawAccess === "tiered" ? "vip_tiered" : rawAccess;

  // 1. Public events
  if (accessType === "public") {
    return { allowed: true };
  }

  // 2. VIP Tiered events: anyone can view, tier assigned at registration
  if (accessType === "vip_tiered") {
    return { allowed: true };
  }

  // 3. Hybrid events: anyone can view public content, gated tiers checked at registration
  if (accessType === "hybrid") {
    return { allowed: true };
  }

  // Verify invite token if provided (valid for invite_only and private)
  let validInvite: InviteLinkDoc | null = null;
  if (token) {
    const cleanToken = String(token).trim();
    if (cleanToken) {
      try {
        // Query inviteLinks collection
        let snap = await adminDb
          .collection(COLLECTIONS.INVITE_LINKS)
          .where("token", "==", cleanToken)
          .limit(1)
          .get();

        // Fallback to legacy collection if empty
        if (snap.empty && COLLECTIONS.EVENT_INVITES) {
          snap = await adminDb
            .collection(COLLECTIONS.EVENT_INVITES)
            .where("token", "==", cleanToken)
            .limit(1)
            .get();
        }

        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          const inviteEventId = String(data.eventId || "");

          if (inviteEventId === event.id) {
            const isSingleUse = Boolean(data.singleUse);
            const isRegistered = data.status === "registered" || Boolean(data.registeredAt);
            const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
            const isExpired = expiresAt && !isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now();

            if (isExpired) {
              return { allowed: false, reason: "invite_expired" };
            }
            if (isSingleUse && isRegistered) {
              return { allowed: false, reason: "invite_used" };
            }

            validInvite = {
              id: doc.id,
              eventId: inviteEventId,
              email: String(data.email || "").toLowerCase().trim(),
              token: cleanToken,
              status: data.status || "pending",
              expiresAt: data.expiresAt,
              singleUse: isSingleUse,
              createdAt: data.createdAt ? String(data.createdAt) : null,
              openedAt: data.openedAt ? String(data.openedAt) : null,
              registeredAt: data.registeredAt ? String(data.registeredAt) : null,
            };
          }
        }
      } catch (err) {
        console.error("[checkAccessGate] invite check error:", err);
      }
    }
  }

  // 4. Invite-Only: requires valid invite token
  if (accessType === "invite_only") {
    if (validInvite) {
      return { allowed: true, invite: validInvite };
    }
    return { allowed: false, reason: "needs_invite" };
  }

  // 5. Private: checks whitelistEmails OR valid accessCode OR valid invite token
  if (accessType === "private") {
    // Check invite token first
    if (validInvite) {
      return { allowed: true, invite: validInvite };
    }

    // Check whitelist emails
    const userEmail = user?.email ? user.email.trim().toLowerCase() : "";
    const whitelist: string[] = Array.isArray(event.whitelistEmails)
      ? event.whitelistEmails.map((e: string) => String(e).trim().toLowerCase())
      : [];

    if (userEmail && whitelist.includes(userEmail)) {
      return { allowed: true };
    }

    // Check access code
    const requiredCode = event.accessCode ? String(event.accessCode).trim() : "";
    if (requiredCode) {
      const submittedCode = code ? String(code).trim() : "";
      if (submittedCode) {
        if (submittedCode === requiredCode) {
          return { allowed: true };
        }
        return { allowed: false, reason: "bad_code" };
      }
      return { allowed: false, reason: "needs_code" };
    }

    // If whitelist is set and user is not on it
    if (whitelist.length > 0) {
      return { allowed: false, reason: "not_whitelisted" };
    }

    // Default private with no code and no whitelist: direct link access allowed
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Standard canAccessEvent helper per user prompt requirement:
 * returns true/false based on accessType.
 */
export async function canAccessEvent(
  event: EventModel | any | null,
  user?: AccessUser | null,
  token?: string | null
): Promise<boolean> {
  const res = await checkAccessGate(event, user, { token });
  return res.allowed;
}
