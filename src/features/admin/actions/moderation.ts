import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { logger } from "@/src/lib/logger";
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
  /** Stored on moderation_logs.extra (e.g. `{ notified: true }`). */
  extra?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from(TABLES.MODERATION_LOGS).insert({
      target_type: input.targetType,
      target_id: input.targetId,
      target_label: input.targetLabel.slice(0, 200),
      action: input.action,
      reason: input.reason.slice(0, 2000),
      admin_id: input.admin.userId,
      admin_email: input.admin.email,
      created_at: new Date().toISOString(),
      ...(input.extra != null ? { extra: input.extra } : {}),
    });
    if (error) throw error;
  } catch (err) {
    logger.error("[logModeration] could not record", {
      action: input.action,
      target: input.targetId,
      err: err instanceof Error ? err.message : "unknown",
    });
  }
}
