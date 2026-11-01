"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { safeAction, safeFail, safeOk, toLegacyResult } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { escapeHtml } from "@/src/lib/email";
import { sendPlatformEmail } from "@/src/lib/email/resend";
import { AuthService } from "@/src/features/auth/authService";
import { NotificationServices } from "@/src/services/notification.services";
import { REPORT_REASONS } from "../types";
import { canManageArea } from "../types";
import { logModeration } from "./moderation";

const IntentSchema = z.enum(["unpublish", "restore", "remove"]);

function plainReason(raw: string): string {
  // Strip tags; store/display as plain text only.
  return escapeHtml(raw)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 2000);
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "anon";
}

async function markOpenReportsActioned(eventId: string, adminId: string) {
  await supabaseAdmin
    .from(TABLES.EVENT_REPORTS)
    .update({
      status: "actioned",
      decided_at: new Date().toISOString(),
      decided_by: adminId,
    })
    .eq("event_id", eventId)
    .eq("status", "open");
}

async function notifyOrganizer(opts: {
  organizerId: string;
  eventId: string;
  title: string;
  intent: "unpublish" | "restore" | "remove";
  reason: string;
}): Promise<boolean> {
  const safeTitle = plainReason(opts.title).slice(0, 200);
  const safeReason = plainReason(opts.reason);
  const verb =
    opts.intent === "restore" ? "restored" : opts.intent === "remove" ? "removed" : "unpublished";

  const inAppTitle =
    opts.intent === "restore" ? `"${safeTitle}" is published again` : `"${safeTitle}" was ${verb}`;
  const inAppMessage =
    opts.intent === "restore"
      ? "An administrator restored your event."
      : `An administrator ${verb} your event. Reason: ${safeReason}`;

  await NotificationServices.createNotification({
    userId: opts.organizerId,
    title: inAppTitle,
    message: inAppMessage,
    type: "category_request",
    deepLink: `/organizer/${opts.organizerId}/events/${opts.eventId}`,
  });

  const { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("email")
    .eq("id", opts.organizerId)
    .maybeSingle();
  const to = String(user?.email || "").trim();
  if (!to.includes("@")) return false;

  const result = await sendPlatformEmail({
    lane: "notifications",
    to,
    subject: inAppTitle,
    // Plain-text body; escapeHtml keeps any residual markup inert if rendered as HTML later.
    html: `<p>${escapeHtml(inAppMessage)}</p><p><a href="${escapeHtml(`/organizer/${opts.organizerId}/events/${opts.eventId}`)}">Open event</a></p>`,
    text: inAppMessage,
  });
  return result.ok;
}

/**
 * Unpublish / restore / remove. Permissions: events:moderate (canManageArea) for
 * unpublish/restore; owner for remove. Maps to holdsArea/canManageArea/isOwner.
 */
export const moderateEventAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    intent: IntentSchema,
    reason: z.string().max(2000).default(""),
    notifyOrganizer: z.boolean().default(true),
    confirmTitle: z.string().optional(),
  }),
  auth: async () => {
    const admin = await AuthService.requireAdmin("events");
    if (!admin) return safeFail("UNAUTHORIZED", "You do not have permission to moderate events.");
    return admin;
  },
  run: async (input, admin) => {
    const rl = rateLimit(`admin-moderate:${admin.userId}`, 30, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many moderation actions. Try again shortly.");

    if (input.intent === "remove") {
      if (!admin.isOwner)
        return safeFail("FORBIDDEN", "Only the platform owner can remove an event.");
    } else if (!canManageArea(admin, "events")) {
      return safeFail("FORBIDDEN", "You need events:moderate to do that.");
    }

    const { data: event, error } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, title, status, organizer_id, moderation_unpublished")
      .eq("id", input.eventId)
      .maybeSingle();
    if (error) throw error;
    if (!event) return safeFail("NOT_FOUND", "That event no longer exists.");

    const title = String(event.title || "Untitled event");
    const reason =
      plainReason(input.reason) || (input.intent === "restore" ? "Restored by administrator" : "");
    if (input.intent !== "restore" && reason.length < 10) {
      return safeFail("VALIDATION", "Give a reason (at least 10 characters).");
    }

    if (input.intent === "remove") {
      const expected = title.trim();
      if (!input.confirmTitle || input.confirmTitle.trim() !== expected) {
        return safeFail("CONFIRM", "Type the event title exactly to confirm removal.");
      }
    }

    if (input.intent === "unpublish") {
      const { error: upd } = await supabaseAdmin
        .from(TABLES.EVENTS)
        .update({ status: "draft", moderation_unpublished: true })
        .eq("id", event.id);
      if (upd) throw upd;
      await markOpenReportsActioned(event.id, admin.userId);
    } else if (input.intent === "restore") {
      const { error: upd } = await supabaseAdmin
        .from(TABLES.EVENTS)
        .update({ status: "published", moderation_unpublished: false })
        .eq("id", event.id);
      if (upd) throw upd;
    } else {
      const { error: upd } = await supabaseAdmin
        .from(TABLES.EVENTS)
        .update({ status: "cancelled", moderation_unpublished: false })
        .eq("id", event.id);
      if (upd) throw upd;
    }

    let notified = false;
    if (input.notifyOrganizer) {
      notified = await notifyOrganizer({
        organizerId: String(event.organizer_id),
        eventId: event.id,
        title,
        intent: input.intent,
        reason,
      });
    }

    const action =
      input.intent === "unpublish"
        ? "unpublished"
        : input.intent === "remove"
          ? "removed"
          : "restored";

    await logModeration({
      admin,
      targetType: "event",
      targetId: event.id,
      targetLabel: title,
      action,
      reason,
      extra: { notified, kind: "owner_notification" },
    });

    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath(`/events/${event.id}`);
    revalidatePath(`/e/${event.id}`);

    return safeOk({ eventId: event.id, intent: input.intent, notified });
  },
});

/** Toast Undo within 10s — restore after unpublish. */
export const undoUnpublishAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
  }),
  auth: async () => {
    const admin = await AuthService.requireAdmin("events");
    if (!admin) return safeFail("UNAUTHORIZED", "You do not have permission to moderate events.");
    if (!canManageArea(admin, "events")) return safeFail("FORBIDDEN", "You need events:moderate.");
    return admin;
  },
  run: async (input, admin) => {
    const rl = rateLimit(`admin-undo-unpub:${admin.userId}`, 20, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many requests.");

    const { data: event, error } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, title, organizer_id, moderation_unpublished")
      .eq("id", input.eventId)
      .maybeSingle();
    if (error) throw error;
    if (!event) return safeFail("NOT_FOUND", "That event no longer exists.");
    if (!event.moderation_unpublished) return safeOk({ eventId: event.id, alreadyRestored: true });

    const { error: upd } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .update({ status: "published", moderation_unpublished: false })
      .eq("id", event.id);
    if (upd) throw upd;

    await logModeration({
      admin,
      targetType: "event",
      targetId: event.id,
      targetLabel: String(event.title || "Untitled event"),
      action: "restored",
      reason: "Undo unpublish",
      extra: { notified: false, undo: true },
    });

    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath(`/events/${event.id}`);
    return safeOk({ eventId: event.id, alreadyRestored: false });
  },
});

export const dismissReportsAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    reportIds: z.array(z.string().uuid()).min(1).optional(),
    dismissAll: z.boolean().optional(),
    adminNote: z.string().max(1000).optional(),
  }),
  auth: async () => {
    const admin = await AuthService.requireAdmin("events");
    if (!admin) return safeFail("UNAUTHORIZED", "You do not have permission to moderate events.");
    if (!canManageArea(admin, "events")) return safeFail("FORBIDDEN", "You need events:moderate.");
    return admin;
  },
  run: async (input, admin) => {
    const rl = rateLimit(`admin-dismiss-report:${admin.userId}`, 40, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many requests.");

    const note = input.adminNote ? plainReason(input.adminNote) : null;
    const now = new Date().toISOString();

    let q = supabaseAdmin
      .from(TABLES.EVENT_REPORTS)
      .update({
        status: "dismissed",
        decided_at: now,
        decided_by: admin.userId,
        admin_note: note,
      })
      .eq("event_id", input.eventId)
      .eq("status", "open");

    if (!input.dismissAll && input.reportIds?.length) {
      q = q.in("id", input.reportIds);
    } else if (!input.dismissAll && !input.reportIds?.length) {
      return safeFail("VALIDATION", "Pick reports to dismiss, or dismiss all.");
    }

    const { data, error } = await q.select("id, reason, event_title");
    if (error) throw error;
    const rows = data ?? [];
    if (!rows.length) return safeFail("NOT_FOUND", "No open reports to dismiss.");

    await logModeration({
      admin,
      targetType: "event",
      targetId: input.eventId,
      targetLabel: String(rows[0]?.event_title || "Event"),
      action: "report_dismissed",
      reason: note || `Dismissed ${rows.length} report(s)`,
      extra: { notified: false, reportIds: rows.map((r) => r.id) },
    });

    revalidatePath("/admin/events");
    return safeOk({ dismissed: rows.length });
  },
});

/**
 * Public report (legacy ActionResult for ReportEvent form).
 * Rate-limit + one report per email (or anon IP) per event per calendar day.
 */
export async function reportEvent(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  try {
    const reason = String(formData.get("reason") ?? "").trim();
    if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
      return fail("Choose why you are reporting this event.");
    }

    const email = String(formData.get("reporterEmail") ?? "")
      .trim()
      .toLowerCase();
    const detail = String(formData.get("detail") ?? "")
      .trim()
      .slice(0, 1000);
    const ip = await clientIp();
    const reporterKey = email.includes("@") ? email : `ip:${ip}`;

    const rl = rateLimit(`report-event:${reporterKey}:${eventId}`, 1, 86_400);
    if (!rl.ok) {
      return fail("You already reported this event today. Thank you.");
    }

    const { data: event, error: evErr } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, title")
      .eq("id", eventId)
      .maybeSingle();
    if (evErr) throw evErr;
    if (!event) return fail("That event no longer exists.");

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    let dedupe = supabaseAdmin
      .from(TABLES.EVENT_REPORTS)
      .select("id")
      .eq("event_id", event.id)
      .gte("created_at", dayStart.toISOString())
      .limit(1);

    if (email.includes("@")) {
      dedupe = dedupe.eq("reporter_email", email);
    } else {
      // Anon: approximate via empty email + same-day rateLimit key already held.
      dedupe = dedupe.eq("reporter_email", "");
    }

    const { data: existing } = await dedupe.maybeSingle();
    if (existing) return fail("You already reported this event today. Thank you.");

    const { error } = await supabaseAdmin.from(TABLES.EVENT_REPORTS).insert({
      event_id: event.id,
      event_title: event.title || "Untitled event",
      reason: plainReason(detail ? `${reason} — ${detail}` : reason),
      reporter_email: email.includes("@") ? email : "",
      status: "open",
      created_at: new Date().toISOString(),
      decided_at: null,
      extra: email.includes("@") ? null : { anon_key: reporterKey },
    });
    if (error) throw error;

    revalidatePath("/admin/events");
    return ok();
  } catch (err) {
    console.error("[reportEvent]", err);
    return fail("Could not send that report. Please try again.");
  }
}

/** @deprecated Prefer moderateEventAction — kept for any leftover ModerationForm posts. */
export async function moderateEvent(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  const intent = String(formData.get("intent") ?? "");
  const result = await moderateEventAction({
    eventId: String(formData.get("eventId") ?? ""),
    intent: intent as "unpublish" | "restore" | "remove",
    reason:
      String(formData.get("reason") ?? "") || (intent === "restore" ? "Restored by admin" : ""),
    notifyOrganizer: true,
    confirmTitle: String(formData.get("confirmTitle") ?? "") || undefined,
  });
  if (
    result.ok &&
    intent === "restore" &&
    String(formData.get("reason") ?? "").trim().length < 10
  ) {
    // restore allowed with short reason via modal chips; legacy path pads above
  }
  return toLegacyResult(result);
}

/** @deprecated Prefer dismissReportsAction */
export async function decideReport(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  const reportId = String(formData.get("reportId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  if (!reportId) return fail("Missing report.");

  const { data: raw } = await supabaseAdmin
    .from(TABLES.EVENT_REPORTS)
    .select("id, event_id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (!raw || String(raw.status) !== "open") return fail("That report is no longer open.");

  if (decision === "approve") {
    const result = await dismissReportsAction({
      eventId: String(raw.event_id),
      reportIds: [reportId],
    });
    return toLegacyResult(result);
  }
  if (decision === "remove") {
    const result = await moderateEventAction({
      eventId: String(raw.event_id),
      intent: "unpublish",
      reason: "Unpublished after a user report.",
      notifyOrganizer: true,
    });
    return toLegacyResult(result);
  }
  return fail("That is not a decision.");
}
