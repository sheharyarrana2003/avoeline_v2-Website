"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { safeAction, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { findInviteByToken } from "../access.service";

const markInviteOpenedInner = safeAction({
  input: z.object({
    token: z.string().trim().min(8).max(200),
  }),
  run: async ({ token }) => {
    const limited = rateLimit(`invite-open:${token.slice(0, 16)}`, 30, 60);
    if (!limited.ok) return safeOk(undefined);

    const invite = await findInviteByToken(token);
    if (!invite || invite.openedAt) return safeOk(undefined);

    await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .update({ opened_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("opened_at", null);

    return safeOk(undefined);
  },
});

/**
 * Record that an invite link was opened.
 * Only sets opened_at when still null (first open).
 */
export async function markInviteOpened(token: string): Promise<void> {
  await markInviteOpenedInner({ token: String(token ?? "") });
}
