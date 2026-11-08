"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail } from "@/src/lib/action";
import { assertEventActor } from "@/src/features/events/ownership";
import { organizerHackathonCachePaths } from "../kinds";

/**
 * Save attachment MB + judging window.
 * Deprecated columns `online_mode` / `livestream_url` are not written (docs/22 A7).
 */
export async function saveHackathonSettings(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  try {
    const event = await assertEventActor(eventId, "settings");
    if (!event) return fail("You cannot change that event.");

    const maxAttachmentMb = Math.min(
      50,
      Math.max(1, Number(formData.get("maxAttachmentMb")) || 10),
    );
    const judgingWindowStart = String(formData.get("judgingWindowStart") ?? "")
      .trim()
      .slice(0, 40);
    const judgingWindowEnd = String(formData.get("judgingWindowEnd") ?? "")
      .trim()
      .slice(0, 40);
    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from(TABLES.HACKATHON_SETTINGS)
      .select("extra")
      .eq("event_id", event.id)
      .maybeSingle();
    const prevExtra =
      existing?.extra && typeof existing.extra === "object" && !Array.isArray(existing.extra)
        ? (existing.extra as Record<string, unknown>)
        : {};

    // Do not set online_mode / livestream_url (deprecated; leave existing DB values untouched).
    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_SETTINGS).upsert({
      event_id: event.id,
      max_attachment_mb: maxAttachmentMb,
      updated_at: now,
      extra: {
        ...prevExtra,
        judgingWindowStart,
        judgingWindowEnd,
      },
    } as never);
    if (error) throw error;

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id))
      revalidatePath(path);
    revalidatePath(`/events/${event.id}/tracks`);
    return { success: true };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[saveHackathonSettings]", err);
    return fail("Could not save those settings. Please try again.");
  }
}
