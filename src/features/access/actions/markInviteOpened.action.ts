"use server";

import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { findInviteByToken } from "../access.service";

/**
 * Record that an invite link was opened (spec 2.2).
 *
 * Called from the event page once, from the browser, rather than during the
 * render: a Server Component render can be repeated or replayed, and a write in
 * one turns "opened" into a count of renders. It is also not the render's job to
 * have side effects.
 *
 * Only ever sets `openedAt` when it is still null, so the value is the FIRST
 * time they looked rather than the most recent. Requires no authorization: the
 * token is the credential, and the only thing this can do to the holder of a
 * valid token is note that they used it.
 */
export async function markInviteOpened(token: string): Promise<void> {
    try {
        const clean = String(token ?? "").trim();
        if (!clean) return;

        const invite = await findInviteByToken(clean);
        if (!invite || invite.openedAt) return;

        await adminDb
            .collection(COLLECTIONS.EVENT_INVITES)
            .doc(invite.id)
            .set({ openedAt: new Date(), updatedAt: new Date() }, { merge: true });
    } catch (err) {
        // Tracking is never worth failing a page view over.
        console.error("[markInviteOpened]", err);
    }
}
