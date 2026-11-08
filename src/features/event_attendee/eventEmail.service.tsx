import {
  bodyHasEmailBlock,
  DEFAULT_EVENT_EMAILS,
  parseIncludeBlocks,
  type EmailIncludeBlock,
  type EventEmailKind,
  type EventEmailTemplate,
} from "./emailTypes";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { absoluteUrl } from "@/src/lib/appUrl";
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
import QRCode from "qrcode";
import { formatFormAnswers, isEventFree, shouldInlineMemberQrs } from "./emailCompose.logic";
import { openInMapsHref } from "@/src/lib/mapsUrl";
import { requireConnectedSender } from "@/src/features/email/organizerTransport.service";

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

/** PNG data URL of a ticket deep-link QR for email HTML (fallback when no hosted door QR). */
async function ticketQrDataUrl(ticketUrl: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(ticketUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
      type: "image/png",
    });
  } catch (err) {
    console.error("[ticketQrDataUrl]", err);
    return null;
  }
}

function buildTextExtras(opts: {
  rawBody: string;
  blocks: EmailIncludeBlock[];
  team: TeamMailContext | null;
  vars: Record<string, string>;
  ticketUrl: string;
}): string[] {
  const { rawBody, blocks, team, vars, ticketUrl } = opts;
  const extras: string[] = [];
  const needs = (block: EmailIncludeBlock) =>
    blocks.includes(block) && !bodyHasEmailBlock(rawBody, block);

  if (team) {
    if (needs("team_name") && team.teamName) extras.push(`Team: ${team.teamName}`);
    if (needs("team_members") && team.members.length) {
      extras.push(
        `Members:\n${team.members.map((m) => `- ${m.name}${m.email ? ` <${m.email}>` : ""}${m.isLead ? " (lead)" : ""}`).join("\n")}`,
      );
    }
    if (needs("competition") && team.trackName) extras.push(`Competition: ${team.trackName}`);
  }
  if (needs("event_details")) {
    extras.push(
      [
        `Event: ${vars.eventTitle}`,
        vars.eventWhen && `When: ${vars.eventWhen}`,
        vars.eventVenue && `Where: ${vars.eventVenue}`,
        vars.eventMapsUrl && `Map: ${vars.eventMapsUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  if (needs("ticket_url")) extras.push(`Ticket: ${ticketUrl}`);
  if (needs("qr_code")) extras.push(`Show this QR at the door: ${ticketUrl}`);
  return extras;
}

function isEmbeddableQrUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("data:image/")) return true;
  if (u.startsWith("drive:") || u.includes("drive.google.com/")) return false;
  return /^https?:\/\//i.test(u);
}

async function buildQrHtml(opts: {
  blocks: EmailIncludeBlock[];
  ticketUrl: string;
  hostedQrUrl?: string | null;
}): Promise<string> {
  if (!opts.blocks.includes("qr_code") || !opts.ticketUrl) return "";
  const hosted = (opts.hostedQrUrl || "").trim();
  const imgSrc =
    (isEmbeddableQrUrl(hosted) ? hosted : "") || (await ticketQrDataUrl(opts.ticketUrl));
  if (imgSrc) {
    return (
      `<p><strong>Show this QR at the door</strong></p>` +
      `<p><a href="${escapeHtml(opts.ticketUrl)}"><img src="${escapeHtml(imgSrc)}" alt="Ticket QR" width="200" height="200" style="display:block;max-width:200px" /></a></p>` +
      `<p><a href="${escapeHtml(opts.ticketUrl)}">Open ticket / status</a></p>`
    );
  }
  return `<p><a href="${escapeHtml(opts.ticketUrl)}">Show this QR at the door — open your ticket</a></p>`;
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
}): Promise<boolean> {
  const to = (opts.registration.attendee?.email || "").trim();
  if (!to) return false;
  if (opts.skipIfSent && alreadySent(opts.registration, opts.kind)) return true;

  const senderGate = await requireConnectedSender(opts.event.organizerId, {
    eventId: opts.event.id,
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
  const ticketUrl = await absoluteUrl(
    `/events/${opts.event.id}/ticket/${opts.registration.registrationId}`,
  );
  const mapsUrl = openInMapsHref(opts.event.mapsUrl || opts.event.mapUrl) || "";
  const free = isEventFree({
    isFree: opts.hidePayment === true || opts.event.pricing?.isFree,
    priceOfTicket: opts.event.PriceOfTicket,
    finalPrice: opts.registration.finalPrice,
  });

  const memberTickets: {
    name: string;
    email: string;
    isLead: boolean;
    ticketUrl: string;
    registrationId: string;
  }[] = [];
  const regs = team?.members.length ? await RegService.getRegsOfEvent(opts.event.id) : [];
  if (team?.members.length) {
    const byEmail = new Map(
      regs.map((r) => [String(r.attendee?.email || "").toLowerCase(), r] as const),
    );
    for (const m of team.members) {
      const memberReg =
        byEmail.get(String(m.email || "").toLowerCase()) || (m.isLead ? opts.registration : null);
      const rid = memberReg?.registrationId || (m.isLead ? opts.registration.registrationId : "");
      if (!rid) continue;
      const url = await absoluteUrl(`/events/${opts.event.id}/ticket/${rid}`);
      memberTickets.push({
        name: m.name,
        email: m.email || "",
        isLead: Boolean(m.isLead),
        ticketUrl: url,
        registrationId: rid,
      });
    }
  }

  const memberTicketLines = memberTickets.map(
    (m) =>
      `- ${m.name}${m.email ? ` <${m.email}>` : ""}${m.isLead ? " (lead)" : ""} — ${m.ticketUrl}`,
  );

  const vars: Record<string, string> = {
    attendeeName: opts.registration.attendee?.name || "there",
    eventTitle: opts.event.title || "Event",
    eventWhen: eventWhen(opts.event),
    eventVenue: eventVenue(opts.event),
    eventMapsUrl: mapsUrl,
    teamName: team?.teamName || "",
    teamMembers:
      memberTicketLines.join("\n") ||
      team?.members.map((m) => `${m.name}${m.isLead ? " (lead)" : ""}`).join(", ") ||
      "",
    competitionName: team?.trackName || "",
    ticketUrl,
    qrCode: ticketUrl,
    formAnswers: formatFormAnswers(opts.registration.customResponses),
    paymentStatus: free ? "" : opts.registration.payment?.paymentStatus || "",
  };

  const rawBody = opts.bodyOverride ?? template.body;
  const subject = interpolate(
    opts.subjectOverride ?? (template.subject || "Message from Avoeline"),
    vars,
  );
  let body = interpolate(rawBody, vars);
  const blocks = opts.includeBlocks ?? template.includeBlocks;
  const extras = buildTextExtras({ rawBody, blocks, team, vars, ticketUrl });
  if (extras.length) body = `${body}\n\n${extras.join("\n\n")}`;

  const paragraphs = body
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const cta =
    (blocks.includes("ticket_url") || blocks.includes("qr_code")) && ticketUrl
      ? `<p><a href="${escapeHtml(ticketUrl)}">Open ticket</a></p>`
      : "";
  const qrHtml = await buildQrHtml({
    blocks,
    ticketUrl,
    hostedQrUrl: opts.registration.qrCode?.imageUrl,
  });

  let membersHtml = "";
  if (blocks.includes("team_members") && memberTickets.length) {
    const inline = shouldInlineMemberQrs(memberTickets.length);
    if (inline) {
      const items: string[] = [];
      const byId = new Map(regs.map((r) => [r.registrationId, r] as const));
      for (const m of memberTickets) {
        const memberReg = byId.get(m.registrationId);
        const img = await buildQrHtml({
          blocks: ["qr_code"],
          ticketUrl: m.ticketUrl,
          hostedQrUrl: memberReg?.qrCode?.imageUrl,
        });
        items.push(
          `<li><strong>${escapeHtml(m.name)}${m.isLead ? " (lead)" : ""}</strong>${
            m.email ? ` &lt;${escapeHtml(m.email)}&gt;` : ""
          }${img}</li>`,
        );
      }
      membersHtml = `<p><strong>Team tickets</strong></p><ul>${items.join("")}</ul>`;
    } else {
      membersHtml = `<p><strong>Team tickets</strong> (open each ticket page for the QR)</p><ul>${memberTickets
        .map(
          (m) =>
            `<li>${escapeHtml(m.name)}${m.isLead ? " (lead)" : ""} — <a href="${escapeHtml(
              m.ticketUrl,
            )}">ticket</a></li>`,
        )
        .join("")}</ul>`;
    }
  }

  const mapsHtml =
    blocks.includes("event_details") && mapsUrl
      ? `<p><a href="${escapeHtml(mapsUrl)}">Open in Maps</a></p>`
      : "";
  const html = `<div><h1>${escapeHtml(subject)}</h1>${paragraphs}${mapsHtml}${membersHtml}${
    qrHtml || cta
  }</div>`;

  const result = await sendViaOrganizerConnection({
    organizerId: opts.event.organizerId,
    to,
    subject,
    html,
    text: body,
    kind: opts.kind,
    eventId: opts.event.id,
    connectionId: senderGate.connectionId,
  });

  if (result.ok) {
    await recordCommunication(opts.registration.registrationId, {
      type: opts.kind,
      sentAt: new Date().toISOString(),
      channel: "email",
      status: "sent",
    });

    if (blocks.includes("email_members_qr") && team?.members.length) {
      const byEmail = new Map(
        regs.map((r) => [String(r.attendee?.email || "").toLowerCase(), r] as const),
      );
      for (const m of team.members) {
        if (m.isLead) continue;
        const memberReg = byEmail.get(String(m.email || "").toLowerCase());
        const memberTo = (memberReg?.attendee?.email || m.email || "").trim();
        if (!memberTo || !memberReg) continue;
        const memberTicket = await absoluteUrl(
          `/events/${opts.event.id}/ticket/${memberReg.registrationId}`,
        );
        const memberQr = await buildQrHtml({
          blocks: ["qr_code"],
          ticketUrl: memberTicket,
          hostedQrUrl: memberReg.qrCode?.imageUrl,
        });
        const memberSubject = `Your ticket QR — ${opts.event.title || "Event"}`;
        const memberBody = `Hello ${m.name || "there"}, here is your personal door QR for ${
          opts.event.title || "the event"
        }.`;
        await sendViaOrganizerConnection({
          organizerId: opts.event.organizerId,
          to: memberTo,
          subject: memberSubject,
          html: `<div><h1>${escapeHtml(memberSubject)}</h1><p>${escapeHtml(memberBody)}</p>${memberQr}</div>`,
          text: `${memberBody}\n${memberTicket}`,
          kind: opts.kind,
          eventId: opts.event.id,
          connectionId: senderGate.connectionId,
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

/** Build interpolated subject/body + extras HTML for sandboxed preview. */
export async function renderEmailPreview(opts: {
  registration: Registration;
  event: EventModel;
  kind: EventEmailKind;
  subjectOverride?: string;
  bodyOverride?: string;
  includeBlocks?: EmailIncludeBlock[];
  hidePayment?: boolean;
}): Promise<{ subject: string; html: string; to: string }> {
  const template = await loadEventEmailTemplate(
    opts.event.id,
    opts.kind === "custom" ? "custom" : opts.kind,
  );
  const team = await teamContextForReg(opts.registration);
  const ticketUrl = await absoluteUrl(
    `/events/${opts.event.id}/ticket/${opts.registration.registrationId}`,
  );
  const mapsUrl = openInMapsHref(opts.event.mapsUrl || opts.event.mapUrl) || "";
  const vars: Record<string, string> = {
    attendeeName: opts.registration.attendee?.name || "Sample Attendee",
    eventTitle: opts.event.title || "Event",
    eventWhen: eventWhen(opts.event),
    eventVenue: eventVenue(opts.event),
    eventMapsUrl: mapsUrl,
    teamName: team?.teamName || "",
    teamMembers: team?.members.map((m) => `${m.name}${m.isLead ? " (lead)" : ""}`).join(", ") || "",
    competitionName: team?.trackName || "",
    ticketUrl,
    qrCode: ticketUrl,
    formAnswers: formatFormAnswers(opts.registration.customResponses),
    paymentStatus: opts.hidePayment ? "" : opts.registration.payment?.paymentStatus || "",
  };
  const rawBody = opts.bodyOverride ?? template.body;
  const subject = interpolate(
    opts.subjectOverride ?? (template.subject || "Message from Avoeline"),
    vars,
  );
  let body = interpolate(rawBody, vars);
  const blocks = opts.includeBlocks ?? template.includeBlocks;
  const extras = buildTextExtras({ rawBody, blocks, team, vars, ticketUrl });
  if (extras.length) body = `${body}\n\n${extras.join("\n\n")}`;
  const qrHtml = await buildQrHtml({
    blocks,
    ticketUrl,
    hostedQrUrl: opts.registration.qrCode?.imageUrl,
  });
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:16px;color:#111">
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h1>
<pre style="white-space:pre-wrap;font:inherit;margin:0 0 16px">${escapeHtml(body)}</pre>
${qrHtml}
</body></html>`;
  return {
    subject,
    html,
    to: (opts.registration.attendee?.email || "").trim() || "sample@example.com",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
