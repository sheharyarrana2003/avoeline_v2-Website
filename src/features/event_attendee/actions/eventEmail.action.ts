"use server";

import { revalidatePath } from "next/cache";
import { assertEventActor } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { EventService } from "@/src/services/event.service";
import { RegService } from "@/src/services/registeration.service";
import { listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import {
  EMAIL_INCLUDE_BLOCKS,
  isEventEmailKind,
  parseIncludeBlocks,
  type EmailIncludeBlock,
  type EventEmailKind,
} from "@/src/features/event_attendee/emailTypes";
import {
  looksLikeEmail,
  renderEmailPreview,
  saveEventEmailTemplate,
  sendOrganizerEmail,
} from "@/src/features/event_attendee/eventEmail.service";
import {
  readRosterFilters,
  registrationMatchesFilters,
} from "@/src/features/event_attendee/roster";
import type { Registration } from "@/src/services/models/reg.type";
import { rateLimit } from "@/src/lib/rateLimit";
import { AuthService } from "@/src/features/auth/authService";

const BULK_CAP = 500;

function blocksFromForm(formData: FormData): EmailIncludeBlock[] {
  return parseIncludeBlocks(formData.getAll("block").map(String));
}

async function saveEventEmailTemplateImpl(formData: FormData): Promise<ActionResult> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "").trim();
  if (!isEventEmailKind(kindRaw)) return fail("Unknown email type.");
  const event = await assertEventActor(eventId, "attendees");
  if (!event) return fail("You cannot edit emails for that event.");
  await saveEventEmailTemplate({
    eventId,
    kind: kindRaw,
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    includeBlocks: blocksFromForm(formData).length
      ? blocksFromForm(formData)
      : [...EMAIL_INCLUDE_BLOCKS.filter((b) => b === "event_details" || b === "ticket_url")],
  });
  revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
  return ok();
}

export async function saveEventEmailTemplateAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const fallback = `/organizer/${String(formData.get("organizerId") ?? "")}/events/${eventId}/attendees`;
  finishForm(
    formData,
    fallback,
    await saveEventEmailTemplateImpl(formData),
    "Email template saved.",
  );
}

export async function sendMemberEmailAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const kindRaw = String(formData.get("kind") ?? "custom").trim();
    if (!isEventEmailKind(kindRaw)) return fail("Unknown email type.");
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return fail("You cannot email attendees for that event.");
    const full = await EventService.getEventByID(eventId);
    if (!full) return fail("Event not found.");
    const regs = await RegService.getRegsOfEvent(eventId);
    const registration = regs.find((r) => r.registrationId === registrationId);
    if (!registration) return fail("That registration is not on this event.");
    if (registration.status === "cancelled") return fail("That registration was cancelled.");
    if (!looksLikeEmail(registration.attendee?.email || ""))
      return fail("This person has no email address.");

    const sent = await sendOrganizerEmail({
      registration,
      event: full,
      kind: kindRaw,
      subjectOverride: String(formData.get("subject") ?? "") || undefined,
      bodyOverride: String(formData.get("body") ?? "") || undefined,
      includeBlocks: blocksFromForm(formData),
    });
    if (!sent) {
      return fail(
        "The email could not be sent. Connect Google under Organizer → Email, then try again.",
      );
    }
    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    return ok();
  } catch (err) {
    console.error("[sendMemberEmailAction]", err);
    return fail("Could not send that email.");
  }
}

function extrasFor(
  reg: Registration,
  teams: { memberIds: string[]; name: string; trackName: string; accessCode: string | null }[],
) {
  const team = teams.find((t) => t.memberIds.includes(reg.registrationId));
  return { teamName: team?.name, trackName: team?.trackName, accessCode: team?.accessCode };
}

export async function sendBulkAttendeeEmailAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { sent?: number }> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const kindRaw = String(formData.get("kind") ?? "custom").trim();
    const mode = String(formData.get("recipientMode") ?? "members");
    if (!isEventEmailKind(kindRaw)) return fail("Unknown email type.");
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return fail("You cannot email attendees for that event.");
    const full = await EventService.getEventByID(eventId);
    if (!full) return fail("Event not found.");

    const regs = await RegService.getRegsOfEvent(eventId);
    const [hackTeams, tracks, groups] = await Promise.all([
      listTeamsOfEvent(eventId),
      listTracks(eventId),
      listRegistrationGroups(eventId),
    ]);
    const teamMeta: {
      memberIds: string[];
      name: string;
      trackName: string;
      accessCode: string | null;
      leadId: string | null;
    }[] = hackTeams.map((t) => ({
      memberIds: t.memberRegistrationIds,
      name: t.name,
      trackName: tracks.find((tr) => tr.id === t.trackId)?.name ?? "",
      accessCode: t.accessCode,
      leadId:
        t.members.find((m) => m.isOwner)?.registrationId ?? t.members[0]?.registrationId ?? null,
    }));
    for (const g of groups) {
      teamMeta.push({
        memberIds: g.memberIds,
        name: g.groupName,
        trackName: "",
        accessCode: null,
        leadId: g.leadRegistrationId,
      });
    }

    const filters = readRosterFilters({
      get: (key: string) => {
        const v = formData.get(key);
        return v == null ? null : String(v);
      },
    });

    const matched = regs.filter((reg) =>
      registrationMatchesFilters({ register: reg }, filters, extrasFor(reg, teamMeta)),
    );

    let targets = matched;
    if (mode === "leads") {
      const leadIds = new Set(teamMeta.map((t) => t.leadId).filter(Boolean) as string[]);
      targets = matched.filter(
        (r) =>
          leadIds.has(r.registrationId) ||
          !teamMeta.some((t) => t.memberIds.includes(r.registrationId)),
      );
      // solo people in the filter still get mail in leads mode
    }

    const withEmail = targets.filter(
      (r) => looksLikeEmail(r.attendee?.email || "") && r.status !== "cancelled",
    );
    const capped = withEmail.slice(0, BULK_CAP);
    if (!capped.length) return fail("Nobody in this filter has an email address.");

    const actor = await AuthService.getCurrentUser();
    const rl = rateLimit(`bulk-attendee-email:${actor?.userId || eventId}`, 5, 60);
    if (!rl.ok) return fail(`Too many bulk sends. Try again in ${rl.retryAfterSec}s.`);

    let sent = 0;
    for (const registration of capped) {
      const okSend = await sendOrganizerEmail({
        registration,
        event: full,
        kind: kindRaw as EventEmailKind,
        subjectOverride: String(formData.get("subject") ?? "") || undefined,
        bodyOverride: String(formData.get("body") ?? "") || undefined,
        includeBlocks: blocksFromForm(formData),
      });
      if (okSend) sent += 1;
    }
    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    if (!sent) {
      return fail("Nothing was sent. Connect Google under Organizer → Email, then try again.");
    }
    return { success: true, sent };
  } catch (err) {
    console.error("[sendBulkAttendeeEmailAction]", err);
    return fail("Could not send those emails.");
  }
}

export async function previewBulkAttendeeEmailAction(
  formData: FormData,
): Promise<
  ActionResult & {
    html?: string;
    subject?: string;
    to?: string;
    count?: number;
    sampleEmails?: string[];
  }
> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const kindRaw = String(formData.get("kind") ?? "custom").trim();
    const mode = String(formData.get("recipientMode") ?? "members");
    if (!isEventEmailKind(kindRaw)) return fail("Unknown email type.");
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return fail("You cannot preview emails for that event.");
    const full = await EventService.getEventByID(eventId);
    if (!full) return fail("Event not found.");

    const regs = await RegService.getRegsOfEvent(eventId);
    const [hackTeams, tracks, groups] = await Promise.all([
      listTeamsOfEvent(eventId),
      listTracks(eventId),
      listRegistrationGroups(eventId),
    ]);
    const teamMeta: {
      memberIds: string[];
      name: string;
      trackName: string;
      accessCode: string | null;
      leadId: string | null;
    }[] = hackTeams.map((t) => ({
      memberIds: t.memberRegistrationIds,
      name: t.name,
      trackName: tracks.find((tr) => tr.id === t.trackId)?.name ?? "",
      accessCode: t.accessCode,
      leadId:
        t.members.find((m) => m.isOwner)?.registrationId ?? t.members[0]?.registrationId ?? null,
    }));
    for (const g of groups) {
      teamMeta.push({
        memberIds: g.memberIds,
        name: g.groupName,
        trackName: "",
        accessCode: null,
        leadId: g.leadRegistrationId,
      });
    }

    const filters = readRosterFilters({
      get: (key: string) => {
        const v = formData.get(key);
        return v == null ? null : String(v);
      },
    });
    const matched = regs.filter((reg) =>
      registrationMatchesFilters({ register: reg }, filters, extrasFor(reg, teamMeta)),
    );
    let targets = matched;
    if (mode === "leads") {
      const leadIds = new Set(teamMeta.map((t) => t.leadId).filter(Boolean) as string[]);
      targets = matched.filter(
        (r) =>
          leadIds.has(r.registrationId) ||
          !teamMeta.some((t) => t.memberIds.includes(r.registrationId)),
      );
    }
    const withEmail = targets.filter(
      (r) => looksLikeEmail(r.attendee?.email || "") && r.status !== "cancelled",
    );
    if (!withEmail.length) return fail("Nobody in this filter has an email address.");
    const sample = withEmail[0]!;
    const hidePayment = full.pricing?.isFree === true || Number(full.PriceOfTicket ?? 0) <= 0;
    const preview = await renderEmailPreview({
      registration: sample,
      event: full,
      kind: kindRaw,
      subjectOverride: String(formData.get("subject") ?? "") || undefined,
      bodyOverride: String(formData.get("body") ?? "") || undefined,
      includeBlocks: blocksFromForm(formData),
      hidePayment,
    });
    return {
      success: true,
      html: preview.html,
      subject: preview.subject,
      to: preview.to,
      count: withEmail.length,
      sampleEmails: withEmail
        .slice(0, 5)
        .map((r) => r.attendee?.email || "")
        .filter(Boolean),
    };
  } catch (err) {
    console.error("[previewBulkAttendeeEmailAction]", err);
    return fail("Could not build that preview.");
  }
}
