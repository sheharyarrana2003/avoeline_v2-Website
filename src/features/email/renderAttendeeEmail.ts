import "server-only";

import { render } from "@react-email/render";
import QRCode from "qrcode";
import { createElement, type ReactElement } from "react";
import { RegistrationReceivedEmail } from "@/emails/attendee/registration-received";
import { RegistrationConfirmedEmail } from "@/emails/attendee/registration-confirmed";
import { RegistrationRejectedEmail } from "@/emails/attendee/registration-rejected";
import { CustomMessageEmail } from "@/emails/attendee/custom-message";
import { AccessInviteEmail } from "@/emails/attendee/access-invite";
import { CertificateReadyEmail } from "@/emails/attendee/certificate-ready";
import { JudgeInviteEmail } from "@/emails/attendee/judge-invite";
import {
  qrContentId,
  type AttendeeEmailMember,
  type RegistrationConfirmedProps,
} from "@/src/features/email/attendeeEmail.model";
import { publicSiteUrl } from "@/src/features/email/publicSiteUrl";
import {
  googleCalendarTemplateUrl,
  type CalendarFallbackInput,
} from "@/src/features/connections/lib/calendarFallbacks";
import { parseScheduleDateTime, formatDateMedium, formatTime } from "@/src/lib/datetime";
import { openInMapsHref } from "@/src/lib/mapsUrl";
import {
  formatFormAnswers,
  isEventFree,
  shouldInlineMemberQrs,
} from "@/src/features/event_attendee/emailCompose.logic";
import type { EmailIncludeBlock, EventEmailKind } from "@/src/features/event_attendee/emailTypes";
import type { EventModel } from "@/src/services/models/event.model";
import type { Registration } from "@/src/services/models/reg.type";
import type { CertificateRow } from "@/src/features/certificates/types";

export type CidAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
  cid: string;
};

export type RenderedAttendeeEmail = {
  subject: string;
  html: string;
  text: string;
  attachments: CidAttachment[];
};

const MAX_BYTES = 100 * 1024;

function eventWhen(event: EventModel): string {
  const date = formatDateMedium(event.schedule?.startDate);
  const time = formatTime(event.schedule?.startTime);
  const tz = event.schedule?.timezone || "";
  return [date, time, tz].filter((p) => p && p !== "—").join(" · ");
}

function eventVenue(event: EventModel): string {
  return [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
}

function calendarInput(event: EventModel): CalendarFallbackInput {
  const start =
    parseScheduleDateTime(event.schedule?.startDate, event.schedule?.startTime) ?? new Date();
  const end =
    parseScheduleDateTime(
      event.schedule?.endDate || event.schedule?.startDate,
      event.schedule?.endTime,
    ) ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const location = [event.location?.venueName, event.location?.address, event.location?.city]
    .filter(Boolean)
    .join(", ");
  return {
    uid: event.id,
    title: event.title || "Event",
    description: event.shortDescription || undefined,
    location: location || undefined,
    url: publicSiteUrl(`/events/${event.id}`),
    start,
    end,
  };
}

function baseDetails(
  event: EventModel,
  opts: {
    ticketType?: string;
    shortCode?: string | null;
    includeEventDetails?: boolean;
  },
): Array<{ label: string; value: string; href?: string }> {
  if (opts.includeEventDetails === false) return [];
  const maps = openInMapsHref(event.mapsUrl || event.mapUrl) || "";
  const venue = eventVenue(event);
  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Date & time", value: eventWhen(event) || "—" },
  ];
  if (venue) rows.push({ label: "Venue", value: venue, href: maps || undefined });
  if (opts.ticketType) rows.push({ label: "Ticket type", value: opts.ticketType });
  if (opts.shortCode) rows.push({ label: "Short code", value: opts.shortCode });
  return rows;
}

function includeFlags(blocks: EmailIncludeBlock[]): RegistrationConfirmedProps["includeBlocks"] {
  return {
    teamName: blocks.includes("team_name"),
    teamMembers: blocks.includes("team_members"),
    competition: blocks.includes("competition"),
    eventDetails: blocks.includes("event_details"),
  };
}

async function pngBufferFromToken(token: string): Promise<Buffer | null> {
  try {
    const dataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 200,
      type: "image/png",
    });
    const b64 = dataUrl.split(",")[1];
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function renderElement(
  el: ReactElement,
  subject: string,
  attachments: CidAttachment[],
): Promise<RenderedAttendeeEmail> {
  let html = await render(el);
  let bytes =
    Buffer.byteLength(html, "utf8") + attachments.reduce((n, a) => n + a.content.length, 0);
  if (bytes > MAX_BYTES) {
    // Drop banner by re-render without it is caller's job; strip large data: imgs if any.
    html = html.replace(/<img[^>]+src="data:image\/[^"]+"[^>]*>/gi, "");
    bytes = Buffer.byteLength(html, "utf8") + attachments.reduce((n, a) => n + a.content.length, 0);
  }
  return { subject, html, text: htmlToText(html), attachments };
}

export type TeamRenderContext = {
  teamName: string;
  trackName: string;
  members: {
    name: string;
    email: string;
    isLead: boolean;
    registrationId: string;
    shortCode?: string | null;
    checkInToken?: string | null;
  }[];
};

export async function renderRegistrationKindEmail(opts: {
  kind: EventEmailKind | "registration_rejected";
  registration: Registration;
  event: EventModel;
  subject: string;
  bodyPlain: string;
  includeBlocks: EmailIncludeBlock[];
  team?: TeamRenderContext | null;
  rejectReason?: string | null;
  organizerReplyTo?: string | null;
  hidePayment?: boolean;
}): Promise<RenderedAttendeeEmail> {
  const free = isEventFree({
    isFree: opts.hidePayment === true || opts.event.pricing?.isFree,
    priceOfTicket: opts.event.PriceOfTicket,
    finalPrice: opts.registration.finalPrice,
  });
  const ticketUrl = publicSiteUrl(
    `/events/${opts.event.id}/ticket/${opts.registration.registrationId}`,
  );
  const cal = calendarInput(opts.event);
  const googleCalendarUrl = googleCalendarTemplateUrl(cal);
  const icsUrl = publicSiteUrl(`/api/events/${opts.event.id}/calendar.ics`);
  const blocks = opts.includeBlocks;
  const showTicket =
    blocks.includes("ticket_url") || blocks.includes("qr_code") || opts.kind !== "custom";
  const flags = includeFlags(blocks);
  const organizerName = opts.event.title || "Organizer";
  const bannerUrl = String(opts.event.bannerImage || "").startsWith("http")
    ? String(opts.event.bannerImage)
    : null;
  const replyTo = opts.organizerReplyTo || null;
  const attachments: CidAttachment[] = [];

  const details = baseDetails(opts.event, {
    ticketType: opts.registration.pricingTier || opts.registration.tier || "General",
    shortCode: opts.registration.shortCode,
    includeEventDetails: flags?.eventDetails !== false || opts.kind !== "custom",
  });

  if (opts.kind === "registration_received") {
    const answers = formatFormAnswers(opts.registration.customResponses)
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(":");
        if (idx < 0) return { label: "Answer", value: line };
        return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      });
    const el = createElement(RegistrationReceivedEmail, {
      preview: `Registration received — ${opts.event.title || "Event"}`,
      organizerName,
      bannerUrl,
      title: opts.subject || "Registration received",
      statusLabel: "Received",
      details,
      primaryCta: showTicket ? { label: "View ticket", url: ticketUrl } : null,
      googleCalendarUrl,
      icsUrl,
      replyTo,
      isFree: free,
      attendeeName: opts.registration.attendee?.name || "there",
      formAnswers: answers,
      paymentStatus: free ? null : opts.registration.payment?.paymentStatus || null,
    });
    return renderElement(el, opts.subject, attachments);
  }

  if (opts.kind === "registration_rejected") {
    const el = createElement(RegistrationRejectedEmail, {
      preview: `Registration update — ${opts.event.title || "Event"}`,
      organizerName,
      bannerUrl,
      title: opts.subject || "Registration not approved",
      statusLabel: "Not approved",
      details: baseDetails(opts.event, { includeEventDetails: true }),
      primaryCta: null,
      replyTo,
      attendeeName: opts.registration.attendee?.name || "there",
      reason: opts.rejectReason || null,
    });
    return renderElement(el, opts.subject, attachments);
  }

  const members: AttendeeEmailMember[] = [];
  let membersOverflow = false;
  const team = opts.team;
  if (team?.members.length && (flags?.teamMembers || opts.kind === "registration_confirmed")) {
    membersOverflow = !shouldInlineMemberQrs(team.members.length);
    for (const m of team.members) {
      const cid = qrContentId(m.registrationId);
      let qrCid: string | null = null;
      if (!membersOverflow && m.checkInToken) {
        const buf = await pngBufferFromToken(m.checkInToken);
        if (buf) {
          attachments.push({
            filename: `qr-${m.registrationId}.png`,
            content: buf,
            contentType: "image/png",
            cid,
          });
          qrCid = cid;
        }
      }
      members.push({
        name: m.name,
        email: m.email,
        isLead: m.isLead,
        shortCode: m.shortCode,
        qrCid,
      });
    }
  }

  let leadQrCid: string | null = null;
  const leadToken = opts.registration.qrCode?.data;
  if ((opts.kind === "registration_confirmed" || blocks.includes("qr_code")) && leadToken) {
    const cid = qrContentId(opts.registration.registrationId);
    const buf = await pngBufferFromToken(leadToken);
    if (buf) {
      if (!attachments.some((a) => a.cid === cid)) {
        attachments.push({
          filename: `qr-${opts.registration.registrationId}.png`,
          content: buf,
          contentType: "image/png",
          cid,
        });
      }
      leadQrCid = cid;
    }
  }

  if (opts.kind === "registration_confirmed") {
    const el = createElement(RegistrationConfirmedEmail, {
      preview: `You're confirmed — ${opts.event.title || "Event"}`,
      organizerName,
      bannerUrl,
      title: opts.subject || "Registration confirmed",
      statusLabel: "Confirmed",
      details,
      primaryCta: { label: "View ticket", url: ticketUrl },
      googleCalendarUrl,
      icsUrl,
      replyTo,
      isFree: free,
      attendeeName: opts.registration.attendee?.name || "there",
      teamName: team?.teamName || null,
      competitionName: team?.trackName || null,
      members,
      membersOverflow,
      leadQrCid,
      shortCode: opts.registration.shortCode,
      includeBlocks: flags,
    });
    return renderElement(el, opts.subject, attachments);
  }

  // custom
  const paragraphs = opts.bodyPlain
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const el = createElement(CustomMessageEmail, {
    preview: opts.subject.slice(0, 90),
    organizerName,
    bannerUrl,
    title: opts.subject || "Message",
    statusLabel: null,
    details: flags?.eventDetails ? details : [],
    primaryCta: showTicket ? { label: "View ticket", url: ticketUrl } : null,
    googleCalendarUrl: flags?.eventDetails ? googleCalendarUrl : null,
    icsUrl: flags?.eventDetails ? icsUrl : null,
    replyTo,
    isFree: free,
    attendeeName: opts.registration.attendee?.name || "there",
    bodyParagraphs: paragraphs,
    teamName: team?.teamName || null,
    competitionName: team?.trackName || null,
    members,
    includeBlocks: flags,
  });
  return renderElement(el, opts.subject, attachments);
}

export async function renderAccessInviteEmail(opts: {
  mode: "invite" | "whitelist";
  organizerName: string;
  eventTitle: string;
  inviteUrl: string;
  subject: string;
  bodyPlain?: string;
  replyTo?: string | null;
  bannerUrl?: string | null;
}): Promise<RenderedAttendeeEmail> {
  const paragraphs = (opts.bodyPlain || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const el = createElement(AccessInviteEmail, {
    preview: opts.subject.slice(0, 90),
    organizerName: opts.organizerName,
    bannerUrl: opts.bannerUrl,
    title: opts.subject,
    statusLabel: opts.mode === "invite" ? "Invite" : "Guest list",
    details: [{ label: "Event", value: opts.eventTitle }],
    primaryCta: {
      label: opts.mode === "invite" ? "Open your personal invitation" : "Register",
      url: opts.inviteUrl,
    },
    replyTo: opts.replyTo || null,
    eventTitle: opts.eventTitle,
    inviteUrl: opts.inviteUrl,
    bodyParagraphs: paragraphs,
    mode: opts.mode,
  });
  return renderElement(el, opts.subject, []);
}

export async function renderCertificateReadyEmail(opts: {
  certificate: CertificateRow;
  organizerName: string;
  viewerUrl: string;
  verifyUrl: string;
  driveShareUrl?: string | null;
  includeDriveLink?: boolean;
  replyTo?: string | null;
}): Promise<RenderedAttendeeEmail> {
  const cert = opts.certificate;
  const eventTitle = cert.data.event_title || "the event";
  const subject = `Your certificate — ${eventTitle}`;
  const el = createElement(CertificateReadyEmail, {
    preview: subject,
    organizerName: opts.organizerName,
    title: "Your certificate is ready",
    statusLabel: "Certificate ready",
    details: [],
    replyTo: opts.replyTo || null,
    recipientName: cert.data.recipient_name || "there",
    eventTitle,
    role: cert.data.role || "Attendee",
    issued: formatDateMedium(cert.issuedAt || cert.createdAt),
    verificationCode: cert.verificationCode,
    viewerUrl: opts.viewerUrl,
    verifyUrl: opts.verifyUrl,
    driveShareUrl:
      opts.includeDriveLink && opts.driveShareUrl ? String(opts.driveShareUrl).trim() : null,
  });
  return renderElement(el, subject, []);
}

export async function renderJudgeInviteEmail(opts: {
  organizerName: string;
  judgeName: string;
  eventTitle: string;
  inviteUrl: string;
  subject: string;
  bodyPlain: string;
  replyTo?: string | null;
}): Promise<RenderedAttendeeEmail> {
  const paragraphs = opts.bodyPlain
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.includes(opts.inviteUrl));
  const el = createElement(JudgeInviteEmail, {
    preview: opts.subject.slice(0, 90),
    organizerName: opts.organizerName,
    title: opts.subject,
    statusLabel: "Judge invite",
    details: [{ label: "Event", value: opts.eventTitle }],
    primaryCta: { label: "Open private invite", url: opts.inviteUrl },
    replyTo: opts.replyTo || null,
    judgeName: opts.judgeName,
    eventTitle: opts.eventTitle,
    inviteUrl: opts.inviteUrl,
    bodyParagraphs: paragraphs,
  });
  return renderElement(el, opts.subject, []);
}
