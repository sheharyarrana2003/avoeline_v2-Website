"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { normalizeEmail, looksLikeEmail } from "@/src/features/access/types";
import { absoluteUrl } from "@/src/lib/appUrl";
import type { InviteLinkDoc } from "../accessEngine.types";
import { sendNotification } from "@/src/lib/notifications";

export interface CreateInviteLinksOptions {
  expiresAt?: string;
  singleUse?: boolean;
}

export interface CreateInviteLinksResult {
  success: boolean;
  error?: string;
  created?: Array<{ email: string; token: string; url: string }>;
  count?: number;
}

/**
 * Generate unique inviteLinks for a list of emails
 */
export async function createInviteLinksAction(
  eventId: string,
  emails: string[],
  options: CreateInviteLinksOptions = {}
): Promise<CreateInviteLinksResult> {
  if (!eventId) return { success: false, error: "Event ID is required." };
  if (!emails || emails.length === 0) {
    return { success: false, error: "Provide at least one email address." };
  }

  const event = await assertOwnedEvent(eventId);
  if (!event) return { success: false, error: "You cannot manage invites for this event." };

  try {
    const cleanEmails = Array.from(
      new Set(
        emails
          .map(normalizeEmail)
          .filter(looksLikeEmail)
      )
    );

    if (cleanEmails.length === 0) {
      return { success: false, error: "No valid email addresses found." };
    }

    const batch = adminDb.batch();
    const created: Array<{ email: string; token: string; url: string }> = [];

    for (const email of cleanEmails) {
      const token = crypto.randomBytes(16).toString("hex");
      const docRef = adminDb.collection(COLLECTIONS.INVITE_LINKS).doc();

      const docData: InviteLinkDoc = {
        id: docRef.id,
        eventId,
        email,
        token,
        status: "pending",
        ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
        singleUse: Boolean(options.singleUse),
        createdAt: new Date().toISOString(),
        openedAt: null,
        registeredAt: null,
      };

      batch.set(docRef, docData);

      // Also mirror to legacy EVENT_INVITES if active
      if (COLLECTIONS.EVENT_INVITES) {
        const legacyRef = adminDb.collection(COLLECTIONS.EVENT_INVITES).doc(docRef.id);
        batch.set(legacyRef, {
          id: docRef.id,
          eventId,
          email,
          name: "",
          kind: "invite",
          token,
          status: "pending",
          tier: "",
          singleUse: Boolean(options.singleUse),
          expiresAt: options.expiresAt || "",
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }

      const linkUrl = `/events/${eventId}?invite=${token}`;
      created.push({ email, token, url: linkUrl });
    }

    await batch.commit();

    // Notifications Engine: trigger invite_link_sent notification for each recipient
    for (const item of created) {
      const fullInviteUrl = await absoluteUrl(item.url);
      await sendNotification(
        item.email,
        "invite_link_sent",
        {
          eventTitle: event.title || "Exclusive Event",
          inviteUrl: fullInviteUrl,
          eventId,
        }
      ).catch((err) => console.error("[createInviteLinksAction] sendNotification error:", err));
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      created,
      count: created.length,
    };
  } catch (err: any) {
    console.error("[createInviteLinksAction] error:", err);
    return { success: false, error: err?.message || "Failed to create invite links." };
  }
}

/**
 * Track status: "opened" when an invite URL is visited
 */
export async function markInviteOpenedAction(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const cleanToken = token.trim();
    // Check inviteLinks
    const snap = await adminDb
      .collection(COLLECTIONS.INVITE_LINKS)
      .where("token", "==", cleanToken)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      if (data.status === "pending") {
        await doc.ref.update({
          status: "opened",
          openedAt: new Date().toISOString(),
        });
      }
      return true;
    }

    // Fallback to legacy EVENT_INVITES
    if (COLLECTIONS.EVENT_INVITES) {
      const legacySnap = await adminDb
        .collection(COLLECTIONS.EVENT_INVITES)
        .where("token", "==", cleanToken)
        .limit(1)
        .get();
      if (!legacySnap.empty) {
        const doc = legacySnap.docs[0];
        if (!doc.data().openedAt) {
          await doc.ref.update({
            openedAt: new Date().toISOString(),
          });
        }
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error("[markInviteOpenedAction] error:", err);
    return false;
  }
}

/**
 * Track status: "registered" when invitee completes registration
 */
export async function markInviteRegisteredAction(
  token: string,
  registrationId: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const cleanToken = token.trim();
    const snap = await adminDb
      .collection(COLLECTIONS.INVITE_LINKS)
      .where("token", "==", cleanToken)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      await doc.ref.update({
        status: "registered",
        registeredAt: new Date().toISOString(),
        registrationId: registrationId || null,
      });
      return true;
    }

    if (COLLECTIONS.EVENT_INVITES) {
      const legacySnap = await adminDb
        .collection(COLLECTIONS.EVENT_INVITES)
        .where("token", "==", cleanToken)
        .limit(1)
        .get();
      if (!legacySnap.empty) {
        await legacySnap.docs[0].ref.update({
          registeredAt: new Date().toISOString(),
          registrationId: registrationId || null,
        });
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error("[markInviteRegisteredAction] error:", err);
    return false;
  }
}
