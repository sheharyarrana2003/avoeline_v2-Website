"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { resolveNotificationRecipient } from "../recipient";

/** Cap per update batch so large inboxes stay within a single request budget. */
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

    const { data: row, error } = await supabaseAdmin
      .from(TABLES.NOTIFICATIONS)
      .select("id, user_id")
      .eq("id", notificationId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return;

    // A Server Action is a public endpoint — the layout guard is not
    // authorization. Only the addressee may mark their own notification read.
    if (row.user_id !== me.ownerId) {
      console.error("[markNotificationRead] rejected: not the addressee", notificationId);
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.NOTIFICATIONS)
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", notificationId);
    if (updateError) throw updateError;

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

    const { data: rows, error } = await supabaseAdmin
      .from(TABLES.NOTIFICATIONS)
      .select("id, status")
      .eq("user_id", me.ownerId);
    if (error) throw error;

    // Filtered here rather than with .neq("status","read"): an inequality
    // would silently skip docs with no status field, which the UI counts as unread.
    const unreadIds = (rows ?? []).filter((d) => d.status !== "read").map((d) => d.id);
    if (unreadIds.length === 0) return;

    const readAt = new Date().toISOString();
    for (let i = 0; i < unreadIds.length; i += BATCH_LIMIT) {
      const chunk = unreadIds.slice(i, i + BATCH_LIMIT);
      const { error: updateError } = await supabaseAdmin
        .from(TABLES.NOTIFICATIONS)
        .update({ status: "read", read_at: readAt })
        .in("id", chunk);
      if (updateError) throw updateError;
    }

    revalidatePath(me.basePath, "layout");
  } catch (err) {
    console.error("[markAllNotificationsRead]", err);
  }
}
