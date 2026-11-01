"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { assertEventActor } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import { sendInviteEmail, sendWhitelistEmail } from "../guestEmails";
import { formatDate } from "@/src/lib/datetime";
import { getEventGuestList } from "../access.service";
import { parseGuestList } from "../types";

const MAX_PER_UPLOAD = 2000;

function inviteToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

export async function addGuests(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const event = await assertEventActor(eventId, "access");
    if (!event) return fail("You cannot change the guest list for that event.");

    const kind = formData.get("kind") === "invite" ? "invite" : "whitelist";
    const expiresAt = String(formData.get("expiresAt") ?? "").trim();
    const singleUse = formData.get("singleUse") === "on";
    const notify = formData.get("notify") === "on";

    let raw = String(formData.get("guests") ?? "");
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > 1024 * 1024)
        return fail("That file is too large. Split it into smaller lists.");
      raw = `${raw}\n${await file.text()}`;
    }
    if (!raw.trim()) return fail("Paste some addresses or choose a CSV file.");

    const report = parseGuestList(raw);
    if (!report.valid.length) {
      return fail(
        report.invalid.length
          ? `No usable addresses. ${report.invalid.length} line(s) were not valid email addresses.`
          : "No usable addresses found.",
      );
    }
    if (report.valid.length > MAX_PER_UPLOAD) {
      return fail(
        `That is ${report.valid.length} addresses. Add at most ${MAX_PER_UPLOAD} at a time.`,
      );
    }

    const existing = new Set((await getEventGuestList(eventId)).map((g) => g.email));
    const fresh = report.valid.filter((g) => !existing.has(g.email));
    const offered = event.access?.attendeeTiers ?? [];
    const now = new Date().toISOString();
    const mailedGuests: { email: string; name?: string; url: string; invite: boolean }[] = [];

    const rows = [];
    for (const guest of fresh) {
      const token = kind === "invite" ? inviteToken() : null;
      rows.push({
        event_id: eventId,
        email: guest.email,
        name: guest.name || null,
        kind: kind === "invite" ? "invite_link" : "whitelist",
        token,
        tier: offered.includes(guest.tier) ? guest.tier : "",
        expires_at: expiresAt ? formatDate(expiresAt) : null,
        single_use: kind === "invite" ? singleUse : false,
        created_at: now,
        updated_at: now,
      });
      if (token) {
        mailedGuests.push({
          email: guest.email,
          name: guest.name || undefined,
          url: await absoluteUrl(`/events/${eventId}?invite=${token}`),
          invite: true,
        });
      } else {
        mailedGuests.push({
          email: guest.email,
          name: guest.name || undefined,
          url: await absoluteUrl(`/events/${eventId}`),
          invite: false,
        });
      }
    }

    if (rows.length) {
      const { error } = await supabaseAdmin.from(TABLES.EVENT_INVITES).insert(rows);
      if (error) throw error;
    }

    let mailed = 0;
    if (notify && mailedGuests.length) {
      for (const guest of mailedGuests) {
        const sent = guest.invite
          ? await sendInviteEmail(event.organizerId, guest.email, event.title, guest.url)
          : await sendWhitelistEmail(event.organizerId, guest.email, event.title, guest.url);
        if (sent.ok) mailed += 1;
      }
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);

    const notes = [
      `${fresh.length} added`,
      report.valid.length - fresh.length
        ? `${report.valid.length - fresh.length} already on the list`
        : "",
      report.duplicates.length ? `${report.duplicates.length} repeated in the upload` : "",
      report.invalid.length
        ? `${report.invalid.length} invalid (line ${report.invalid
            .map((i) => i.line)
            .slice(0, 5)
            .join(", ")})`
        : "",
      notify && mailedGuests.length ? `${mailed} emailed` : "",
    ].filter(Boolean);

    return report.invalid.length || report.duplicates.length || fresh.length !== report.valid.length
      ? fail(notes.join(" · "))
      : ok();
  } catch (err) {
    console.error("[addGuests]", err);
    return fail("Could not update the guest list. Please try again.");
  }
}

export async function removeGuest(formData: FormData): Promise<void> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const guestId = String(formData.get("guestId") ?? "").trim();
    if (!guestId) return;

    const event = await assertEventActor(eventId, "access");
    if (!event) return;

    const { data } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .select("id, event_id")
      .eq("id", guestId)
      .maybeSingle();
    if (!data || String(data.event_id) !== eventId) return;

    await supabaseAdmin.from(TABLES.EVENT_INVITES).delete().eq("id", guestId);
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
  } catch (err) {
    console.error("[removeGuest]", err);
  }
}
