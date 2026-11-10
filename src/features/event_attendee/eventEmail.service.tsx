import {
  DEFAULT_EVENT_EMAILS,
  parseIncludeBlocks,
  type EmailIncludeBlock,
  type EventEmailKind,
  type EventEmailTemplate,
} from "./emailTypes";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";
import { sendNotification } from "@/src/lib/notifications";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { Registration } from "@/src/services/models/reg.type";
import {
  hydrateRegistrationRow,
  mapToRegistration,
  RegService,
} from "@/src/services/registeration.service";
import {
  eventIsHackathon,
  listTeamsOfEvent,
  listTracks,
} from "@/src/features/hackathon/hackathon.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import { recordCommunication } from "@/src/features/registration/registration.service";
import { formatFormAnswers, isEventFree } from "./emailCompose.logic";
import { openInMapsHref } from "@/src/lib/mapsUrl";
import { requireConnectedSender } from "@/src/features/email/organizerTransport.service";
import {
  renderRegistrationKindEmail,
  type TeamRenderContext,
} from "@/src/features/email/renderAttendeeEmail";
import { publicSiteUrl } from "@/src/features/email/publicSiteUrl";

const TOKEN_KEYS = [
  "attendeeName",
  "eventTitle",
  "eventWhen",
  "eventVenue",
  "eventMapsUrl",
  "teamName",
  "teamMembers",
  "competitionName",
  "ticketUrl",
  "qrCode",
  "formAnswers",
  "paymentStatus",
] as const;

export function paymentOk(reg: Registration): boolean {
  if (Number(reg.finalPrice ?? 0) <= 0) return true;
  return reg.payment?.paymentStatus === "completed";
}

export function admitted(reg: Registration): boolean {
  return reg.status === "confirmed" || reg.status === "checked_in" || reg.status === "attended";
}

export function autoEmailKind(reg: Registration): Exclude<EventEmailKind, "custom"> | null {
  if (admitted(reg) && paymentOk(reg)) return "registration_confirmed";
  if (reg.status === "awaiting_payment" || reg.status === "pending") return "registration_received";
  return null;
}

function interpolate(text: string, vars: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
    if (!(TOKEN_KEYS as readonly string[]).includes(key)) return "";
    return vars[key] ?? "";
  });
}

export async function listEventEmailTemplates(eventId: string): Promise<EventEmailTemplate[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.EVENT_EMAIL_TEMPLATES)
    .select("*")
    .eq("event_id", eventId)
    .order("kind");
  return (data ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    kind: row.kind as EventEmailKind,
    subject: row.subject ?? "",
    body: row.body ?? "",
    includeBlocks: parseIncludeBlocks(row.include_blocks),
  }));
}

export async function loadEventEmailTemplate(
  eventId: string,
  kind: EventEmailKind,
): Promise<EventEmailTemplate> {
  if (kind !== "custom") {
    const { data } = await supabaseAdmin
      .from(TABLES.EVENT_EMAIL_TEMPLATES)
      .select("*")
      .eq("event_id", eventId)
      .eq("kind", kind)
      .maybeSingle();
    if (data) {
      return {
        id: data.id,
        eventId,
        kind,
        subject: data.subject || DEFAULT_EVENT_EMAILS[kind].subject,
        body: data.body || DEFAULT_EVENT_EMAILS[kind].body,
        includeBlocks: parseIncludeBlocks(data.include_blocks).length
          ? parseIncludeBlocks(data.include_blocks)
          : DEFAULT_EVENT_EMAILS[kind].includeBlocks,
      };
    }
    const fallback = DEFAULT_EVENT_EMAILS[kind];
    return { id: null, eventId, kind, ...fallback };
  }
  return { id: null, eventId, kind: "custom", subject: "", body: "", includeBlocks: [] };
}

export async function saveEventEmailTemplate(input: {
  eventId: string;
  kind: EventEmailKind;
  subject: string;
  body: string;
  includeBlocks: EmailIncludeBlock[];
}): Promise<void> {
  const payload = {
    subject: input.subject.slice(0, 200),
    body: input.body.slice(0, 8000),
    include_blocks: input.includeBlocks,
    updated_at: new Date().toISOString(),
  };
  if (input.kind === "custom") {
    await supabaseAdmin.from(TABLES.EVENT_EMAIL_TEMPLATES).insert({
      event_id: input.eventId,
      kind: "custom",
      ...payload,
    });
    return;
  }
  const existing = await loadEventEmailTemplate(input.eventId, input.kind);
  if (existing.id) {
    await supabaseAdmin.from(TABLES.EVENT_EMAIL_TEMPLATES).update(payload).eq("id", existing.id);
    return;
  }
  await supabaseAdmin.from(TABLES.EVENT_EMAIL_TEMPLATES).insert({
    event_id: input.eventId,
    kind: input.kind,
    ...payload,
  });
}

export type TeamMailContext = {
  teamName: string;
  trackName: string;
  members: { name: string; email: string; isLead: boolean }[];
  leadRegistrationId: string | null;
};

export async function teamContextForReg(reg: Registration): Promise<TeamMailContext | null> {
  const eventModel = await EventService.getEventByID(reg.eventId);
  if (!eventModel) return null;
  const hackathon = await eventIsHackathon(eventModel);

  if (hackathon) {
    const teams = await listTeamsOfEvent(reg.eventId);
    const team = teams.find((t) => t.memberRegistrationIds.includes(reg.registrationId));
    if (team) {
      const tracks = await listTracks(reg.eventId);
      const leadId =
        team.members.find((m) => m.isOwner)?.registrationId ??
        team.members[0]?.registrationId ??
        null;
      return {
        teamName: team.name,
        trackName: tracks.find((tr) => tr.id === team.trackId)?.name ?? "",
        members: team.members.map((m) => ({
          name: m.name,
          email: m.email,
          isLead: m.registrationId === leadId,
        })),
        leadRegistrationId: leadId,
      };
    }
  }

  if (!reg.groupId) return null;
  const groups = await listRegistrationGroups(reg.eventId);
  const group = groups.find((g) => g.id === reg.groupId);
  if (!group) return null;
  const regs = await RegService.getRegsOfEvent(reg.eventId);
  const byId = new Map(regs.map((r) => [r.registrationId, r]));
  return {
    teamName: group.groupName,
    trackName: "",
    members: group.memberIds.map((id) => {
      const m = byId.get(id);
      return {
        name: m?.attendee?.name || "",
        email: m?.attendee?.email || "",
        isLead: id === group.leadRegistrationId,
      };
    }),
    leadRegistrationId: group.leadRegistrationId,
  };
}

function eventWhen(event: EventModel): string {
  const date = formatDateMedium(event.schedule?.startDate);
  const time = formatTime(event.schedule?.startTime);
  return [date, time].filter((p) => p && p !== "—").join(" · ");
}

function eventVenue(event: EventModel): string {
  return [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
}

function alreadySent(reg: Registration, kind: string): boolean {
  return (reg.communications ?? []).some((c) => c.type === kind && c.status === "sent");
}

export async function isTeamLead(reg: Registration): Promise<boolean> {
  const ctx = await teamContextForReg(reg);
  if (!ctx) return true;
  return ctx.leadRegistrationId === reg.registrationId;
}

async function buildTeamRenderContext(reg: Registration): Promise<TeamRenderContext | null> {
  const team = await teamContextForReg(reg);
  if (!team?.members.length) return null;
  const regs = await RegService.getRegsOfEvent(reg.eventId);
  const byEmail = new Map(
    regs.map((r) => [String(r.attendee?.email || "").toLowerCase(), r] as const),
  );
  return {
    teamName: team.teamName,
    trackName: team.trackName,
    members: team.members.map((m) => {
      const memberReg = byEmail.get(String(m.email || "").toLowerCase()) || (m.isLead ? reg : null);
      return {
        name: m.name,
        email: m.email || "",
        isLead: Boolean(m.isLead),
        registrationId: memberReg?.registrationId || reg.registrationId,
        shortCode: memberReg?.shortCode || null,
        checkInToken: memberReg?.qrCode?.data || null,
      };
    }),
  };
}

function buildVars(opts: {
  registration: Registration;
  event: EventModel;
  team: TeamMailContext | null;
  hidePayment?: boolean;
}): Record<string, string> {
  const ticketUrl = publicSiteUrl(
    `/events/${opts.event.id}/ticket/${opts.registration.registrationId}`,
  );
  const mapsUrl = openInMapsHref(opts.event.mapsUrl || opts.event.mapUrl) || "";
  const free = isEventFree({
    isFree: opts.hidePayment === true || opts.event.pricing?.isFree,
    priceOfTicket: opts.event.PriceOfTicket,
    finalPrice: opts.registration.finalPrice,
  });
  return {
    attendeeName: opts.registration.attendee?.name || "there",
    eventTitle: opts.event.title || "Event",
    eventWhen: eventWhen(opts.event),
    eventVenue: eventVenue(opts.event),
    eventMapsUrl: mapsUrl,
    teamName: opts.team?.teamName || "",
    teamMembers:
      opts.team?.members.map((m) => `${m.name}${m.isLead ? " (lead)" : ""}`).join(", ") || "",
    competitionName: opts.team?.trackName || "",
    ticketUrl,
    qrCode: ticketUrl,
    formAnswers: formatFormAnswers(opts.registration.customResponses),
    paymentStatus: free ? "" : opts.registration.payment?.paymentStatus || "",
  };
}

export async function sendOrganizerEmail(opts: {
  registration: Registration;
  event: EventModel;
  kind: EventEmailKind;
  subjectOverride?: string;
  bodyOverride?: string;
  includeBlocks?: EmailIncludeBlock[];
  skipIfSent?: boolean;
  hidePayment?: boolean;
  connectionId?: string | null;
  rejectReason?: string | null;
}): Promise<boolean> {
  const to = (opts.registration.attendee?.email || "").trim();
  if (!to) return false;
  if (opts.skipIfSent && alreadySent(opts.registration, opts.kind)) return true;

  const senderGate = await requireConnectedSender(opts.event.organizerId, {
    eventId: opts.event.id,
    connectionId: opts.connectionId,
  });
  if (!senderGate.ok) {
    console.warn(
      "[sendOrganizerEmail] blocked — connect email at " +
        `/organizer/${opts.event.organizerId}/settings/connections`,
      senderGate.code,
    );
    return false;
  }

  const template = await loadEventEmailTemplate(
    opts.event.id,
    opts.kind === "custom" ? "custom" : opts.kind,
  );
  const team = await teamContextForReg(opts.registration);
  const vars = buildVars({
    registration: opts.registration,
    event: opts.event,
    team,
    hidePayment: opts.hidePayment,
  });
  const rawBody = opts.bodyOverride ?? template.body;
  const subject = interpolate(
    opts.subjectOverride ?? (template.subject || "Message from Avoeline"),
    vars,
  );
  const bodyPlain = interpolate(rawBody, vars);
  const blocks = opts.includeBlocks ?? template.includeBlocks;
  const teamRender = await buildTeamRenderContext(opts.registration);

  const rendered = await renderRegistrationKindEmail({
    kind: opts.kind,
    registration: opts.registration,
    event: opts.event,
    subject,
    bodyPlain,
    includeBlocks: blocks,
    team: teamRender,
    rejectReason: opts.rejectReason,
    organizerReplyTo: null,
    hidePayment: opts.hidePayment,
  });

  const result = await sendViaOrganizerConnection({
    organizerId: opts.event.organizerId,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    kind: opts.kind,
    eventId: opts.event.id,
    connectionId: senderGate.connectionId,
    attachments: rendered.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      cid: a.cid,
    })),
  });

  if (result.ok) {
    await recordCommunication(opts.registration.registrationId, {
      type: opts.kind,
      sentAt: new Date().toISOString(),
      channel: "email",
      status: "sent",
    });

    if (blocks.includes("email_members_qr") && teamRender?.members.length) {
      for (const m of teamRender.members) {
        if (m.isLead) continue;
        const memberTo = (m.email || "").trim();
        if (!memberTo) continue;
        const memberReg = {
          ...opts.registration,
          registrationId: m.registrationId,
          attendee: { name: m.name, email: m.email, phone: "" },
          shortCode: m.shortCode || "",
          qrCode: { data: m.checkInToken || "", imageUrl: "" },
        } as Registration;
        const memberRendered = await renderRegistrationKindEmail({
          kind: "custom",
          registration: memberReg,
          event: opts.event,
          subject: `Your ticket — ${opts.event.title || "Event"}`,
          bodyPlain: `Hello ${m.name || "there"}, here is your ticket for ${opts.event.title || "the event"}.`,
          includeBlocks: ["ticket_url", "qr_code"],
          team: null,
          hidePayment: opts.hidePayment,
        });
        await sendViaOrganizerConnection({
          organizerId: opts.event.organizerId,
          to: memberTo,
          subject: memberRendered.subject,
          html: memberRendered.html,
          text: memberRendered.text,
          kind: opts.kind,
          eventId: opts.event.id,
          connectionId: senderGate.connectionId,
          attachments: memberRendered.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
            cid: a.cid,
          })),
        }).catch((err) => console.error("[sendOrganizerEmail] member QR", err));
      }
    }

    return true;
  }

  if (result.code === "NO_CONNECTION") {
    console.warn(
      "[sendOrganizerEmail] blocked — organizer has no Google connection. " +
        `Connect at /organizer/${opts.event.organizerId}/settings/connections`,
    );
  } else if (result.error) {
    console.error("[sendOrganizerEmail] provider error", result.error);
  }
  return false;
}

export async function maybeAutoEventEmail(registrationId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("*")
    .eq("id", registrationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  const reg = mapToRegistration(hydrateRegistrationRow(data as Record<string, unknown>), data.id);
  if (reg.status === "cancelled" || reg.status === "rejected" || reg.status === "waitlisted")
    return;
  if (!(await isTeamLead(reg))) return;

  const kind = autoEmailKind(reg);
  if (!kind) return;

  const event = await EventService.getEventByID(reg.eventId);
  if (!event) return;

  await sendOrganizerEmail({ registration: reg, event, kind, skipIfSent: true });

  if (kind === "registration_confirmed") {
    const recipientUserId = reg.userId || reg.attendee?.email;
    if (recipientUserId) {
      await sendNotification(recipientUserId, "registration_confirmed", {
        attendeeName: reg.attendee?.name || "there",
        eventTitle: event.title || "Event",
        eventId: event.id,
      }).catch((err) => console.error("[maybeAutoEventEmail] sendNotification", err));
    }
  }
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function composeRenderedEmail(opts: {
  registration: Registration;
  event: EventModel;
  kind: EventEmailKind;
  subjectOverride?: string;
  bodyOverride?: string;
  includeBlocks?: EmailIncludeBlock[];
  hidePayment?: boolean;
}) {
  const template = await loadEventEmailTemplate(
    opts.event.id,
    opts.kind === "custom" ? "custom" : opts.kind,
  );
  const team = await teamContextForReg(opts.registration);
  const vars = buildVars({
    registration: opts.registration,
    event: opts.event,
    team,
    hidePayment: opts.hidePayment,
  });
  const rawBody = opts.bodyOverride ?? template.body;
  const subject = interpolate(
    opts.subjectOverride ?? (template.subject || "Message from Avoeline"),
    vars,
  );
  const bodyPlain = interpolate(rawBody, vars);
  const blocks = opts.includeBlocks ?? template.includeBlocks;
  const teamRender = await buildTeamRenderContext(opts.registration);
  return renderRegistrationKindEmail({
    kind: opts.kind,
    registration: opts.registration,
    event: opts.event,
    subject,
    bodyPlain,
    includeBlocks: blocks,
    team: teamRender,
    hidePayment: opts.hidePayment,
  });
}

/** Full render for outbox / bulk per-recipient (N6). */
export async function renderOrganizerEmailPayload(opts: {
  registration: Registration;
  event: EventModel;
  kind: EventEmailKind;
  subjectOverride?: string;
  bodyOverride?: string;
  includeBlocks?: EmailIncludeBlock[];
  hidePayment?: boolean;
}) {
  return composeRenderedEmail(opts);
}

/** Build interpolated subject/body HTML for sandboxed preview (same path as send). */
export async function renderEmailPreview(opts: {
  registration: Registration;
  event: EventModel;
  kind: EventEmailKind;
  subjectOverride?: string;
  bodyOverride?: string;
  includeBlocks?: EmailIncludeBlock[];
  hidePayment?: boolean;
}): Promise<{ subject: string; html: string; text: string; to: string }> {
  const rendered = await composeRenderedEmail(opts);
  let html = rendered.html;
  for (const att of rendered.attachments) {
    const dataUrl = `data:${att.contentType};base64,${att.content.toString("base64")}`;
    html = html.replaceAll(`cid:${att.cid}`, dataUrl);
  }
  return {
    subject: rendered.subject,
    html,
    text: rendered.text,
    to: (opts.registration.attendee?.email || "").trim() || "sample@example.com",
  };
}
