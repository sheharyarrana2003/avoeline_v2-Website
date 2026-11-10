/** Client-safe props for attendee-facing React Email templates (N6). */

export type AttendeeEmailMember = {
  name: string;
  email: string;
  isLead: boolean;
  shortCode?: string | null;
  /** Content-ID without angle brackets, e.g. qr-{id}@avoeline */
  qrCid?: string | null;
};

export type AttendeeEmailDetail = {
  label: string;
  value: string;
  href?: string;
};

export type AttendeeEmailBaseProps = {
  preview: string;
  organizerName: string;
  bannerUrl?: string | null;
  title: string;
  statusLabel?: string | null;
  details: AttendeeEmailDetail[];
  primaryCta?: { label: string; url: string } | null;
  googleCalendarUrl?: string | null;
  icsUrl?: string | null;
  replyTo?: string | null;
  isFree?: boolean;
};

export type RegistrationReceivedProps = AttendeeEmailBaseProps & {
  attendeeName: string;
  formAnswers: Array<{ label: string; value: string }>;
  paymentStatus?: string | null;
};

export type RegistrationConfirmedProps = AttendeeEmailBaseProps & {
  attendeeName: string;
  teamName?: string | null;
  competitionName?: string | null;
  members?: AttendeeEmailMember[];
  /** When true, show member list without per-member QRs (team > 10). */
  membersOverflow?: boolean;
  leadQrCid?: string | null;
  shortCode?: string | null;
  includeBlocks?: {
    teamName?: boolean;
    teamMembers?: boolean;
    competition?: boolean;
    eventDetails?: boolean;
  };
};

export type RegistrationRejectedProps = AttendeeEmailBaseProps & {
  attendeeName: string;
  reason?: string | null;
};

export type CustomMessageProps = AttendeeEmailBaseProps & {
  attendeeName: string;
  bodyParagraphs: string[];
  teamName?: string | null;
  competitionName?: string | null;
  members?: AttendeeEmailMember[];
  includeBlocks?: RegistrationConfirmedProps["includeBlocks"];
};

export type AccessInviteProps = AttendeeEmailBaseProps & {
  eventTitle: string;
  inviteUrl: string;
  bodyParagraphs?: string[];
  mode: "invite" | "whitelist";
};

export type CertificateReadyProps = AttendeeEmailBaseProps & {
  recipientName: string;
  eventTitle: string;
  role: string;
  issued: string;
  verificationCode: string;
  viewerUrl: string;
  verifyUrl: string;
  driveShareUrl?: string | null;
};

export type JudgeInviteProps = AttendeeEmailBaseProps & {
  judgeName: string;
  eventTitle: string;
  inviteUrl: string;
  bodyParagraphs: string[];
};

/** Stable markers for composer checkbox / snapshot tests. */
export const EMAIL_MARKERS = {
  teamName: 'data-avl-block="team_name"',
  teamMembers: 'data-avl-block="team_members"',
  competition: 'data-avl-block="competition"',
  eventDetails: 'data-avl-block="event_details"',
  ticketCta: 'data-avl-block="ticket_url"',
  payment: 'data-avl-block="payment"',
} as const;

export function qrContentId(registrationId: string): string {
  const id = String(registrationId || "x")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 36);
  return `qr-${id || "x"}@avoeline`;
}

export function countTicketHrefs(html: string): number {
  const re = /\/events\/[^"'>\s]+\/ticket\/[^"'>\s]+/gi;
  const matches = html.match(re) || [];
  return new Set(matches.map((m) => m.toLowerCase())).size;
}
