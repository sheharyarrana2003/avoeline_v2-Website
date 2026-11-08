export const EVENT_EMAIL_KINDS = [
  "registration_received",
  "registration_confirmed",
  "custom",
] as const;
export type EventEmailKind = (typeof EVENT_EMAIL_KINDS)[number];

/** Include blocks for compose UI. `email_members_qr` is option-only (no body snippet). */
export const EMAIL_INCLUDE_BLOCKS = [
  "team_name",
  "team_members",
  "competition",
  "event_details",
  "ticket_url",
  "qr_code",
  "email_members_qr",
] as const;
export type EmailIncludeBlock = (typeof EMAIL_INCLUDE_BLOCKS)[number];

export type EventEmailTemplate = {
  id: string | null;
  eventId: string;
  kind: EventEmailKind;
  subject: string;
  body: string;
  includeBlocks: EmailIncludeBlock[];
};

export const DEFAULT_EVENT_EMAILS: Record<
  Exclude<EventEmailKind, "custom">,
  { subject: string; body: string; includeBlocks: EmailIncludeBlock[] }
> = {
  registration_received: {
    subject: "We have your registration - {{eventTitle}}",
    body: "Hello {{attendeeName}}, we have received your registration for {{eventTitle}}. You will be confirmed shortly.\n\nYour answers:\n{{formAnswers}}",
    includeBlocks: ["event_details", "ticket_url"],
  },
  registration_confirmed: {
    subject: "Registration confirmed - {{eventTitle}}",
    body: "Hello {{attendeeName}}, your registration for {{eventTitle}} is confirmed. Your ticket is ready.",
    includeBlocks: ["team_members", "event_details", "ticket_url", "qr_code"],
  },
};

export const EMAIL_BLOCK_LABELS: Record<EmailIncludeBlock, string> = {
  team_name: "Team name",
  team_members: "Team members",
  competition: "Competition",
  event_details: "Event date and venue",
  ticket_url: "Ticket / status link",
  qr_code: "Door QR (ticket link)",
  email_members_qr: "Also email each member their own QR",
};

/** Plain-text snippets injected into the compose body when a block is checked. */
export const EMAIL_BLOCK_SNIPPETS: Record<EmailIncludeBlock, string> = {
  team_name: "Team: {{teamName}}",
  team_members: "Members:\n{{teamMembers}}",
  competition: "Competition: {{competitionName}}",
  event_details:
    "Event: {{eventTitle}}\nWhen: {{eventWhen}}\nWhere: {{eventVenue}}\nMap: {{eventMapsUrl}}",
  ticket_url: "Ticket / status: {{ticketUrl}}",
  qr_code: "Show this QR at the door: {{ticketUrl}}",
  email_members_qr: "",
};

export function wrapEmailBlock(block: EmailIncludeBlock, inner: string): string {
  return `[${block}]\n${inner}\n[/${block}]`;
}

/** True when the compose body already carries a marked include block. */
export function bodyHasEmailBlock(body: string, block: EmailIncludeBlock): boolean {
  return body.includes(`[${block}]`);
}

/**
 * Append or remove a marked include block in the compose body.
 * Markers let toggles reverse cleanly without eating organizer edits outside the block.
 */
export function toggleEmailBlockInBody(
  body: string,
  block: EmailIncludeBlock,
  enabled: boolean,
): string {
  const re = new RegExp(`\\n*\\[${block}\\][\\s\\S]*?\\[\\/${block}\\]`, "g");
  const stripped = body
    .replace(re, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  if (!enabled) return stripped;
  const snippetText = EMAIL_BLOCK_SNIPPETS[block];
  // Option-only blocks (no body snippet) just flip the include list.
  if (!snippetText.trim()) return stripped;
  const snippet = wrapEmailBlock(block, snippetText);
  return stripped ? `${stripped}\n\n${snippet}` : snippet;
}

export function isEventEmailKind(value: string): value is EventEmailKind {
  return (EVENT_EMAIL_KINDS as readonly string[]).includes(value);
}

export function parseIncludeBlocks(raw: unknown): EmailIncludeBlock[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.filter((b): b is EmailIncludeBlock =>
    (EMAIL_INCLUDE_BLOCKS as readonly string[]).includes(String(b)),
  );
}

/** Client-safe token menu for compose UIs. */
export const EMAIL_TOKEN_MENU: { token: string; label: string; paymentOnly?: boolean }[] = [
  { token: "{{attendeeName}}", label: "Attendee name" },
  { token: "{{eventTitle}}", label: "Event title" },
  { token: "{{eventWhen}}", label: "Event date/time" },
  { token: "{{eventVenue}}", label: "Venue" },
  { token: "{{eventMapsUrl}}", label: "Maps link" },
  { token: "{{teamName}}", label: "Team name" },
  { token: "{{teamMembers}}", label: "Team members" },
  { token: "{{competitionName}}", label: "Competition" },
  { token: "{{ticketUrl}}", label: "Ticket link" },
  { token: "{{qrCode}}", label: "Door QR (ticket link)" },
  { token: "{{formAnswers}}", label: "Form answers" },
  { token: "{{paymentStatus}}", label: "Payment status", paymentOnly: true },
];
