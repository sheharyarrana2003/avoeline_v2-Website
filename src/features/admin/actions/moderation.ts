import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import type { AdminIdentity, ModerationAction, ModerationTarget } from "../types";

/**
 * Write one line into the panel's audit trail (spec 9.4's "reason field logged
 * for records").
 *
 * Shared by the event, organizer and vendor actions, because the spec asks for
 * a logged reason on event moderation and the other two decisions are exactly
 * as consequential. One trail beats three.
 *
 * Its own collection rather than a field on the thing it describes: a new field
 * on an event document is invisible through `EventModel`'s constructor, and a
 * new field on an organizer document is invisible through `mapToOrganizer` --
 * both are strict mappers. And a vendor decision has no event to hang off.
 *
 * Never throws. The write it accompanies has already happened by the time this
 * runs, so a failed log must not report the action as failed -- it is logged to
 * the console instead, which is the only honest thing left to do.
 */
export async function logModeration(input: {
    admin: AdminIdentity;
    targetType: ModerationTarget;
    targetId: string;
    targetLabel: string;
    action: ModerationAction;
    reason: string;
}): Promise<void> {
    try {
        const ref = adminDb.collection(COLLECTIONS.MODERATION_LOG).doc();
        await ref.set({
            id: ref.id,
            targetType: input.targetType,
            targetId: input.targetId,
            targetLabel: input.targetLabel.slice(0, 200),
            action: input.action,
            reason: input.reason.slice(0, 2000),
            adminId: input.admin.userId,
            adminEmail: input.admin.email,
            createdAt: new Date(),
        });
    } catch (err) {
        console.error("[logModeration] could not record", { action: input.action, target: input.targetId, err });
    }
}
