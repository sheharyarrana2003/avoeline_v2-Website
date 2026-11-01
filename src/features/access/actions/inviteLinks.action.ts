"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { normalizeEmail, looksLikeEmail } from "@/src/features/access/types";
import { absoluteUrl } from "@/src/lib/appUrl";
import { sendInviteEmail } from "../guestEmails";

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

export async function createInviteLinksAction(
  eventId: string,
  emails: string[],
  options: CreateInviteLinksOptions = {},
): Promise<CreateInviteLinksResult> {
  if (!eventId) return { success: false, error: "Event ID is required." };
  if (!emails || emails.length === 0) {
    return { success: false, error: "Provide at least one email address." };
  }

  const event = await assertOwnedEvent(eventId);
  if (!event) return { success: false, error: "You cannot manage invites for this event." };

  try {
    const cleanEmails = Array.from(new Set(emails.map(normalizeEmail).filter(looksLikeEmail)));
    if (cleanEmails.length === 0) {
      return { success: false, error: "No valid email addresses found." };
    }

    const now = new Date().toISOString();
    const rows = cleanEmails.map((email) => {
      const token = crypto.randomBytes(16).toString("hex");
      return {
        event_id: eventId,
        email,
        name: "",
        kind: "invite_link",
        token,
        tier: "",
        single_use: Boolean(options.singleUse),
        expires_at: options.expiresAt || null,
        created_at: now,
        updated_at: now,
        extra: { status: "pending", demo_seed: undefined },
      };
    });

    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .insert(rows)
      .select("id, email, token");
    if (error) throw error;

    const created = (data ?? []).map((row) => ({
      email: String(row.email),
      token: String(row.token),
      url: `/events/${eventId}?invite=${row.token}`,
    }));

    for (const item of created) {
      const fullInviteUrl = await absoluteUrl(item.url);
      await sendInviteEmail(
        event.organizerId,
        item.email,
        event.title || "Exclusive Event",
        fullInviteUrl,
      ).catch((err) => console.error("[createInviteLinksAction] sendEmail error:", err));
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}`);
    revalidatePath(`/events/${eventId}`);

    return { success: true, created, count: created.length };
  } catch (err: unknown) {
    console.error("[createInviteLinksAction] error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create invite links.",
    };
  }
}

export async function markInviteOpenedAction(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const cleanToken = token.trim();
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .select("id, opened_at, extra")
      .eq("token", cleanToken)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return false;

    const extra = (data.extra as Record<string, unknown> | null) ?? {};
    if (!data.opened_at && extra.status !== "opened" && extra.status !== "registered") {
      await supabaseAdmin
        .from(TABLES.EVENT_INVITES)
        .update({
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          extra: { ...extra, status: "opened" },
        })
        .eq("id", data.id);
    }
    return true;
  } catch (err) {
    console.error("[markInviteOpenedAction] error:", err);
    return false;
  }
}
