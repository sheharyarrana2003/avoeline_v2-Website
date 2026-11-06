"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { regStatusToDb } from "@/data/statusMaps";
import { assertEventActor } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import { escapeHtml, sendEmail } from "@/src/lib/email";
import { RegService } from "@/src/services/registeration.service";
import type { Registration, RegistrationStatus } from "@/src/services/models/reg.type";
import { sendNotification } from "@/src/lib/notifications";
import { maybeRevealHackathonAccessCodes } from "@/src/features/hackathon/accessCodes.service";
import { maybeAutoEventEmail } from "@/src/features/event_attendee/eventEmail.service";

async function setStatus(
  reg: Registration,
  status: RegistrationStatus,
  extra: Record<string, unknown> = {},
) {
  const history = [...(reg.statusHistory ?? []), { status, timestamp: new Date().toISOString() }];
  const { error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .update({
      status: regStatusToDb(status),
      status_history: history,
      updated_at: new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(extra).map(([k, v]) => [
          k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
          v,
        ]),
      ),
    })
    .eq("id", reg.registrationId);
  if (error) throw error;
}

/** Internal waitlist promotion — not a public Server Action. */
async function promoteWaitlistTransaction(eventId: string): Promise<{
  promoted: boolean;
  registrationId?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  eventTitle?: string;
  status?: RegistrationStatus;
} | null> {
  try {
    const [{ data: event }, { data: waitlisted }] = await Promise.all([
      supabaseAdmin
        .from(TABLES.EVENTS)
        .select("id, title, organizer_id, extra, requires_approval")
        .eq("id", eventId)
        .maybeSingle(),
      supabaseAdmin
        .from(TABLES.REGISTRATIONS)
        .select("id, attendee_name, attendee_email, status_history, extra")
        .eq("event_id", eventId)
        .eq("status", "waitlisted")
        .order("created_at", { ascending: true })
        .limit(1),
    ]);

    if (!event) return { promoted: false };
    const row = waitlisted?.[0];
    if (!row) return { promoted: false };

    const extra = (event.extra as Record<string, unknown> | null) ?? {};
    const access = (extra.access as { requiresApproval?: boolean } | undefined) ?? {};
    const approvalRequired = Boolean(event.requires_approval ?? access.requiresApproval);
    const promotedStatus: RegistrationStatus = approvalRequired ? "pending" : "confirmed";
    const now = new Date().toISOString();
    const history = Array.isArray(row.status_history) ? [...(row.status_history as unknown[])] : [];
    history.push({ status: promotedStatus, timestamp: now });

    const { error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        status: regStatusToDb(promotedStatus),
        status_history: history,
        updated_at: now,
        extra: { ...((row.extra as object) || {}), waitlistPosition: 0 },
      })
      .eq("id", row.id)
      .eq("status", "waitlisted");
    if (error) throw error;

    const result = {
      promoted: true,
      registrationId: row.id,
      attendeeEmail: row.attendee_email || undefined,
      attendeeName: row.attendee_name || undefined,
      eventTitle: String(event.title || "Event"),
      status: promotedStatus,
    };

    if (result.attendeeEmail && result.registrationId) {
      const ticketUrl = await absoluteUrl(`/events/${eventId}/ticket/${result.registrationId}`);
      await sendEmail(
        { email: result.attendeeEmail, name: result.attendeeName },
        {
          subject: `A place has opened up at ${result.eventTitle}`,
          html: `<p>Good news — a place at <strong>${escapeHtml(result.eventTitle || "the event")}</strong> has opened up and you are off the waitlist.</p>
<p><a href="${escapeHtml(ticketUrl)}">View your ticket</a></p>`,
          senderName: result.eventTitle,
        },
      );

      await sendNotification(result.registrationId || result.attendeeEmail, "waitlist_promoted", {
        attendeeName: result.attendeeName || "Attendee",
        eventTitle: result.eventTitle || "Event",
        eventId,
      }).catch((err) => console.error("[promoteWaitlistTransaction] sendNotification error:", err));
    }

    return result;
  } catch (err) {
    console.error("[promoteWaitlistTransaction] failed", { eventId, err });
    return null;
  }
}

/** Promote waitlist after a seat frees — requires attendees grant. */
export async function promoteFromWaitlist(eventId: string): Promise<number> {
  try {
    if (!(await assertEventActor(eventId, "attendees"))) return 0;
    const res = await promoteWaitlistTransaction(eventId);
    if (res?.promoted) {
      const { data: event } = await supabaseAdmin
        .from(TABLES.EVENTS)
        .select("organizer_id")
        .eq("id", eventId)
        .maybeSingle();
      if (event?.organizer_id) {
        revalidatePath(`/organizer/${event.organizer_id}/events/${eventId}/attendees`);
      }
      if (res.registrationId) await maybeAutoEventEmail(res.registrationId);
      return 1;
    }
    return 0;
  } catch (err) {
    console.error("[promoteFromWaitlist]", { eventId, err });
    return 0;
  }
}

export async function decideRegistration(formData: FormData): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const decision = String(formData.get("decision") ?? "");
    if (!registrationId) return fail("Missing registration.");
    if (decision !== "approve" && decision !== "reject") return fail("Choose approve or reject.");

    const event = await assertEventActor(eventId, "attendees");
    if (!event) return fail("You cannot decide registrations for that event.");

    const regs = await RegService.getRegsOfEvent(eventId);
    const reg = regs.find((r) => r.registrationId === registrationId);
    if (!reg) return fail("That registration no longer exists.");
    if (reg.status !== "pending") return fail("That registration has already been decided.");

    const approved = decision === "approve";
    await setStatus(reg, approved ? "confirmed" : "rejected");
    if (approved) {
      await maybeRevealHackathonAccessCodes(registrationId);
      await maybeAutoEventEmail(registrationId);
    }

    const email = reg.attendee?.email;
    if (email) {
      const ticketUrl = await absoluteUrl(`/events/${eventId}/ticket/${registrationId}`);
      await sendEmail(
        { email, name: reg.attendee?.name || undefined },
        {
          subject: approved
            ? `You're confirmed for ${event.title}`
            : `About your registration for ${event.title}`,
          html: approved
            ? `<p>Your registration for <strong>${escapeHtml(event.title)}</strong> has been approved.</p>
<p><a href="${escapeHtml(ticketUrl)}">View your ticket</a></p>`
            : `<p>Your registration for <strong>${escapeHtml(event.title)}</strong> was not approved by the organizer.</p>`,
          senderName: event.title,
        },
      );
    }

    if (!approved) await promoteWaitlistTransaction(eventId);

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(eventId, ["attendees", "checkin"]);

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/attendees`);
    return ok();
  } catch (err) {
    console.error("[decideRegistration]", err);
    return fail("Could not record that decision. Please try again.");
  }
}

export async function cancelRegistrationAction(formData: FormData): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    if (!eventId || !registrationId) return fail("Missing event or registration ID.");

    const { data: reg, error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("id, user_id, status_history")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) throw error;
    if (!reg) return fail("Registration not found.");

    const current = await AuthService.getCurrentUser();
    const isOwner = !!current?.userId && String(reg.user_id) === current.userId;
    const asStaff = !!(await assertEventActor(eventId, "attendees"));
    if (!isOwner && !asStaff) return fail("You cannot cancel that registration.");

    const now = new Date().toISOString();
    const history = Array.isArray(reg.status_history) ? [...(reg.status_history as unknown[])] : [];
    history.push({ status: "cancelled", timestamp: now });

    const { error: updErr } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        status: "cancelled",
        cancelled_at: now,
        status_history: history,
        updated_at: now,
      })
      .eq("id", registrationId);
    if (updErr) throw updErr;

    await promoteWaitlistTransaction(eventId);

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(eventId, ["attendees", "checkin"]);

    const { data: event } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("organizer_id")
      .eq("id", eventId)
      .maybeSingle();
    if (event?.organizer_id) {
      revalidatePath(`/organizer/${event.organizer_id}/events/${eventId}/attendees`);
    }
    revalidatePath(`/events/${eventId}`);
    return ok();
  } catch (err) {
    console.error("[cancelRegistrationAction]", err);
    return fail("Could not cancel registration.");
  }
}
