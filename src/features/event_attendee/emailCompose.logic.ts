import {
  EMAIL_BLOCK_SNIPPETS,
  bodyHasEmailBlock,
  toggleEmailBlockInBody,
  type EmailIncludeBlock,
} from "./emailTypes";

/** Inline QR images for each member when team size is at most this. */
export const MEMBER_QR_INLINE_LIMIT = 10;

export type MemberTicketLine = {
  name: string;
  email?: string;
  isLead?: boolean;
  ticketUrl: string;
};

/** Decide whether lead mail embeds member QRs or only ticket links. */
export function shouldInlineMemberQrs(memberCount: number): boolean {
  return memberCount > 0 && memberCount <= MEMBER_QR_INLINE_LIMIT;
}

export function previewSubstitute(text: string, sample: Record<string, string>): string {
  let out = text;
  for (const [key, value] of Object.entries(sample)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export const COMPOSER_PREVIEW_SAMPLE: Record<string, string> = {
  attendeeName: "Alex",
  eventTitle: "Sample Event",
  eventWhen: "Sat 10:00",
  eventVenue: "Main Hall",
  eventMapsUrl: "https://maps.example.com",
  teamName: "Team Nova",
  teamMembers: "Alex (lead), Sam",
  competitionName: "Track A",
  ticketUrl: "https://example.com/ticket",
  qrCode: "https://example.com/ticket",
  paymentStatus: "completed",
  formAnswers: "Shirt size: M",
};

/** Build the live preview body after include-block toggles. */
export function composerPreviewBody(opts: {
  body: string;
  blocks: EmailIncludeBlock[];
  hidePayment?: boolean;
}): { subjectSample: string; bodySample: string } {
  const sample = {
    ...COMPOSER_PREVIEW_SAMPLE,
    paymentStatus: opts.hidePayment ? "" : COMPOSER_PREVIEW_SAMPLE.paymentStatus,
  };
  let body = opts.body;
  for (const block of opts.blocks) {
    if (block === "email_members_qr") continue;
    if (!bodyHasEmailBlock(body, block) && EMAIL_BLOCK_SNIPPETS[block]?.trim()) {
      body = toggleEmailBlockInBody(body, block, true);
    }
  }
  return {
    subjectSample: previewSubstitute("Registration — {{eventTitle}}", sample),
    bodySample: previewSubstitute(body, sample),
  };
}

export function formatFormAnswers(answers: Record<string, unknown> | null | undefined): string {
  if (!answers) return "";
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(answers)) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`${label}: ${value}`);
  }
  return lines.join("\n");
}

export function isEventFree(opts: {
  isFree?: boolean | null;
  priceOfTicket?: number | null;
  finalPrice?: number | null;
}): boolean {
  if (opts.isFree === true) return true;
  if (Number(opts.priceOfTicket ?? 0) <= 0 && Number(opts.finalPrice ?? 0) <= 0) return true;
  return false;
}
