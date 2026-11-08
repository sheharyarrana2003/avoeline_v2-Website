import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { assertEventActor } from "@/src/features/events/ownership";
import { requireCompeteRegistration } from "@/src/features/hackathon/competeSession";
import type { FileCategory, StoredFileRow } from "./types";

export type FileAccessDecision =
  { ok: true; userId: string | null } | { ok: false; status: number; error: string };

const COMPETE_FILE_CATEGORIES = new Set<FileCategory>([
  "hackathon_phase",
  "hackathon_task",
  "hackathon_submission",
]);

/**
 * Authorize viewing a stored file via linked entity:
 * - event staff / organizer (`assertEventActor`)
 * - registration owner (user_id match) for payment_proof / registration entity
 * - compete-cookie team member for hackathon phase/task/submission files on that event
 */
export async function authorizeStoredFileAccess(row: StoredFileRow): Promise<FileAccessDecision> {
  const user = await AuthService.getCurrentUser().catch(() => null);

  if (row.eventId) {
    const actor =
      (await assertEventActor(row.eventId, "files")) ||
      (await assertEventActor(row.eventId, "attendees")) ||
      (await assertEventActor(row.eventId, "overview")) ||
      (await assertEventActor(row.eventId, "tasks")) ||
      (await assertEventActor(row.eventId, "submissions"));
    if (actor) return { ok: true, userId: user?.userId || null };
  }

  if (user?.userId && row.organizerId && user.userId === row.organizerId) {
    return { ok: true, userId: user.userId };
  }

  if (
    user?.userId &&
    (row.entityType === "registration" || row.category === "payment_proof") &&
    row.entityId
  ) {
    const { data } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("id, user_id")
      .eq("id", row.entityId)
      .maybeSingle();
    if (data?.user_id && data.user_id === user.userId) {
      return { ok: true, userId: user.userId };
    }
  }

  if (row.eventId && COMPETE_FILE_CATEGORIES.has(row.category)) {
    const compete = await requireCompeteRegistration(row.eventId);
    if (compete) {
      const { data: team } = await supabaseAdmin
        .from(TABLES.HACKATHON_TEAMS)
        .select("id")
        .eq("id", compete.teamId)
        .eq("event_id", row.eventId)
        .maybeSingle();
      if (team) return { ok: true, userId: user?.userId || null };
    }
  }

  if (!user) {
    return { ok: false, status: 401, error: "Sign in required." };
  }

  return { ok: false, status: 403, error: "You do not have access to this file." };
}

export { contentDisposition, shouldInline } from "./fileRefs.logic";
