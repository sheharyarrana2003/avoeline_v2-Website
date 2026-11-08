"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { assertEventActor } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { rateLimit } from "@/src/lib/rateLimit";
import { absoluteUrl } from "@/src/lib/appUrl";
import { AuthService } from "@/src/features/auth/authService";
import {
  requireConnectedSender,
  sendViaOrganizerConnection,
} from "@/src/features/email/organizerTransport.service";
import { getCapacity } from "@/src/features/connections/server/capacity.service";
import {
  findActiveEmailConnection,
  getConnectionById,
} from "@/src/features/connections/server/connections.service";
import { getEventGuestList } from "../access.service";
import {
  applyGuestEmailTokens,
  filterGuestRecipients,
  guestLinkFor,
  type GuestEmailFilter,
} from "../guestEmail.logic";

const FILTERS: GuestEmailFilter[] = [
  "all_pending",
  "selected",
  "not_opened",
  "not_registered",
  "failed_or_pending_resend",
];

function isFilter(v: string): v is GuestEmailFilter {
  return (FILTERS as string[]).includes(v);
}

export async function sendGuestEmailBatchAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { sent?: number; skipped?: number }> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const event = await assertEventActor(eventId, "access");
    if (!event) return fail("You cannot email guests for that event.");

    const filterRaw = String(formData.get("filter") ?? "all_pending").trim();
    if (!isFilter(filterRaw)) return fail("Unknown recipient filter.");

    const selectedIds = String(formData.get("selectedIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const subjectTpl = String(formData.get("subject") ?? "").trim();
    const bodyTpl = String(formData.get("body") ?? "").trim();
    if (!subjectTpl || !bodyTpl) return fail("Subject and body are required.");

    const actor = await AuthService.getCurrentUser();
    if (!actor) return fail("Sign in required.");
    const rl = rateLimit(`guest-email-batch:${actor.userId || eventId}`, 5, 60);
    if (!rl.ok) return fail(`Too many guest sends. Try again in ${rl.retryAfterSec}s.`);

    const sender = await requireConnectedSender(event.organizerId, { eventId });
    if (!sender.connected) {
      return fail(
        "Connect Google under Settings → Connections to send. Use Copy link on each row as a fallback.",
      );
    }

    const preferredConnectionId = String(formData.get("connectionId") ?? "").trim() || undefined;
    const conn = preferredConnectionId
      ? await getConnectionById(preferredConnectionId)
      : await findActiveEmailConnection({
          ownerType: "user",
          ownerId: event.organizerId,
        });
    if (!conn || conn.status !== "active") {
      return fail("Connect Google under Settings → Connections, then try again.");
    }

    const capacity = await getCapacity({
      connection: conn,
      ownerId: event.organizerId,
      kind: "access_invite",
      eventId,
    });
    const cap = Math.min(capacity.maxPerSend, Math.max(0, capacity.remainingBulk));
    if (cap < 1) {
      return fail(
        capacity.blockedReason ||
          "No bulk send capacity left today. Wait for slots to free up or try again later.",
      );
    }

    const guests = await getEventGuestList(eventId);
    const withStatus = guests.map((g) => {
      const extraStatus =
        // last email status is only on rows we previously updated; map from revoke extra is enough for filter
        null as "sent" | "failed" | "pending" | null;
      return { ...g, lastEmailStatus: extraStatus };
    });

    // Re-read extras for resend filter
    const { data: rawRows } = await supabaseAdmin
      .from(TABLES.EVENT_INVITES)
      .select("id, extra")
      .eq("event_id", eventId);
    const statusById = new Map<string, "sent" | "failed" | "pending" | null>();
    for (const row of rawRows ?? []) {
      const extra = (row.extra as Record<string, unknown> | null) ?? {};
      const st = String(extra.lastEmailStatus || "");
      statusById.set(
        String(row.id),
        st === "sent" || st === "failed" || st === "pending" ? st : null,
      );
    }
    for (const g of withStatus) {
      g.lastEmailStatus = statusById.get(g.id) ?? null;
    }

    const targets = filterGuestRecipients(withStatus, filterRaw, selectedIds).slice(0, cap);
    if (!targets.length) return fail("Nobody matched that filter.");

    const eventUrl = await absoluteUrl(`/events/${eventId}`);
    let sent = 0;
    let skipped = 0;

    for (const guest of targets) {
      const link = guestLinkFor(guest, eventUrl);
      const vars = {
        inviteLink: guest.kind === "invite" ? link : eventUrl,
        eventLink: eventUrl,
        name: guest.name || guest.email.split("@")[0] || "there",
        email: guest.email,
      };
      const subject = applyGuestEmailTokens(subjectTpl, vars).slice(0, 200);
      const body = applyGuestEmailTokens(bodyTpl, vars);
      const html = body
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${escapeMinimal(l)}</p>`)
        .join("");
      const htmlWithLink = `${html}<p><a href="${escapeMinimal(link)}">Open your link</a></p>`;

      const result = await sendViaOrganizerConnection({
        organizerId: event.organizerId,
        to: guest.email,
        subject,
        html: htmlWithLink,
        text: `${body}\n\n${link}`,
        kind: "access_invite",
        eventId,
        connectionId: conn.id,
      });

      const now = new Date().toISOString();
      const { data: row } = await supabaseAdmin
        .from(TABLES.EVENT_INVITES)
        .select("extra")
        .eq("id", guest.id)
        .maybeSingle();
      const extra = (row?.extra as Record<string, unknown> | null) ?? {};
      await supabaseAdmin
        .from(TABLES.EVENT_INVITES)
        .update({
          updated_at: now,
          extra: {
            ...extra,
            lastEmailAt: now,
            lastEmailStatus: result.ok ? "sent" : "failed",
          },
        })
        .eq("id", guest.id);

      if (result.ok) sent += 1;
      else skipped += 1;
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
    if (!sent) return fail("Nothing was sent. Check Connections capacity and try again.");
    return { ...ok(), sent, skipped };
  } catch (err) {
    console.error("[sendGuestEmailBatchAction]", err);
    return fail("Could not send guest emails. Please try again.");
  }
}

function escapeMinimal(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
