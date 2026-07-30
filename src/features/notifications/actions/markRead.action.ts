"use server";

import { revalidatePath } from "next/cache";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { resolveNotificationRecipient } from "../recipient";

/** Firestore caps a WriteBatch at 500 operations. */
const BATCH_LIMIT = 500;

// Both actions return void rather than the usual `{ success, error }`: they are
// bound to a plain <form action={...}>, which discards the return value, and
// that is the shape every other form-bound action here uses (see
// app/vendor/[vendor_id]/services/page.tsx:246). They swallow their own errors
// instead — marking read is idempotent and non-destructive, so a silent no-op is
// an acceptable failure mode. Give them a result type if a useActionState
// consumer ever needs to render the error.

export async function markNotificationRead(formData: FormData): Promise<void> {
    try {
        const me = await resolveNotificationRecipient();
        if (!me) return;

        const notificationId = String(formData.get("notificationId") ?? "").trim();
        if (!notificationId) return;

        const ref = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
        const snap = await ref.get();
        if (!snap.exists) return;

        // A Server Action is a public endpoint — the layout guard is not
        // authorization. Only the addressee may mark their own notification read.
        if (snap.data()?.userId !== me.ownerId) {
            console.error("[markNotificationRead] rejected: not the addressee", notificationId);
            return;
        }

        await ref.update({ status: "read", readAt: new Date() });

        // "layout" scope on the role root so the header's unread badge refreshes
        // along with the page below it. Note the round trip is slow (~6s observed
        // in dev): the list and badge do update on their own, just not instantly.
        revalidatePath(me.basePath, "layout");
    } catch (err) {
        console.error("[markNotificationRead]", err);
    }
}

export async function markAllNotificationsRead(): Promise<void> {
    try {
        const me = await resolveNotificationRecipient();
        if (!me) return;

        const snapshot = await adminDb
            .collection(COLLECTIONS.NOTIFICATIONS)
            .where("userId", "==", me.ownerId)
            .get();

        // Filtered here rather than with where("status","!=","read"): an
        // inequality would need its own composite index and would silently skip
        // docs with no status field, which the UI counts as unread.
        const unread = snapshot.docs.filter(
            (d: QueryDocumentSnapshot) => d.data()?.status !== "read"
        );
        if (unread.length === 0) return;

        const readAt = new Date();
        for (let i = 0; i < unread.length; i += BATCH_LIMIT) {
            const batch = adminDb.batch();
            for (const doc of unread.slice(i, i + BATCH_LIMIT)) {
                batch.update(doc.ref, { status: "read", readAt });
            }
            await batch.commit();
        }

        revalidatePath(me.basePath, "layout");
    } catch (err) {
        console.error("[markAllNotificationsRead]", err);
    }
}
