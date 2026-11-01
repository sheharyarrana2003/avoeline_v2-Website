import "server-only";

import { escapeHtml } from "@/src/lib/email";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";

export type RecruitmentEmailKind = "shortlisted" | "onboarded" | "interview";

const DEFAULTS: Record<
  RecruitmentEmailKind,
  {
    subject: string;
    html: (name: string, inviteLink?: string, extras?: InterviewEmailExtras) => string;
    text: (name: string, inviteLink?: string, extras?: InterviewEmailExtras) => string;
  }
> = {
  shortlisted: {
    subject: "You've been shortlisted for the event team",
    html: (name) =>
      `<p>Hello ${escapeHtml(name)},</p><p>You've been shortlisted for the event team. We'll follow up with next steps.</p>`,
    text: (name) =>
      `Hello ${name},\n\nYou've been shortlisted for the event team. We'll follow up with next steps.`,
  },
  onboarded: {
    subject: "You're on the event team — set your password",
    html: (name, inviteLink) =>
      `<p>Hello ${escapeHtml(name)},</p><p>You've been accepted onto the event team.</p>${
        inviteLink ? `<p><a href="${escapeHtml(inviteLink)}">Set your password</a></p>` : ""
      }`,
    text: (name, inviteLink) =>
      `Hello ${name},\n\nYou've been accepted onto the event team.${inviteLink ? `\n\nSet your password: ${inviteLink}` : ""}`,
  },
  interview: {
    subject: "Interview scheduled",
    html: (name, _link, extras) => {
      const when = extras?.whenLabel
        ? `<p><strong>When:</strong> ${escapeHtml(extras.whenLabel)}</p>`
        : "";
      const where = extras?.location
        ? `<p><strong>Where:</strong> ${escapeHtml(extras.location)}</p>`
        : extras?.link
          ? `<p><strong>Link:</strong> <a href="${escapeHtml(extras.link)}">${escapeHtml(extras.link)}</a></p>`
          : "";
      const notes = extras?.notes ? `<p>${escapeHtml(extras.notes)}</p>` : "";
      return `<p>Hello ${escapeHtml(name)},</p><p>Your interview has been scheduled.</p>${when}${where}${notes}`;
    },
    text: (name, _link, extras) => {
      const parts = [`Hello ${name},`, "", "Your interview has been scheduled."];
      if (extras?.whenLabel) parts.push(`When: ${extras.whenLabel}`);
      if (extras?.location) parts.push(`Where: ${extras.location}`);
      if (extras?.link) parts.push(`Link: ${extras.link}`);
      if (extras?.notes) parts.push(extras.notes);
      return parts.join("\n");
    },
  },
};

export type InterviewEmailExtras = {
  whenLabel?: string;
  location?: string;
  link?: string;
  notes?: string;
};

const CONNECT_GOOGLE = "Connect Google under Organizer → Email before sending recruitment emails.";

/**
 * Event-scoped recruitment mail via organizer Google (fail-closed, no Resend).
 */
export async function sendRecruitmentEmail(opts: {
  organizerId: string;
  to: string;
  name: string;
  kind: RecruitmentEmailKind;
  inviteLink?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  interview?: InterviewEmailExtras;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const defaults = DEFAULTS[opts.kind];
  const subject = (opts.subject || "").trim() || defaults.subject;
  const customHtml = (opts.bodyHtml || "").trim();
  const customText = (opts.bodyText || "").trim();

  let html: string;
  let text: string;
  if (customHtml) {
    html = customHtml
      .replaceAll("{{name}}", escapeHtml(opts.name))
      .replaceAll("{{inviteLink}}", opts.inviteLink ? escapeHtml(opts.inviteLink) : "")
      .replaceAll("{{when}}", escapeHtml(opts.interview?.whenLabel || ""))
      .replaceAll(
        "{{location}}",
        escapeHtml(opts.interview?.location || opts.interview?.link || ""),
      )
      .replaceAll("{{notes}}", escapeHtml(opts.interview?.notes || ""));
    text =
      customText ||
      customHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (opts.inviteLink && !html.includes(opts.inviteLink) && opts.kind === "onboarded") {
      html += `<p><a href="${escapeHtml(opts.inviteLink)}">Set your password</a></p>`;
      text += `\n\nSet your password: ${opts.inviteLink}`;
    }
  } else {
    html = defaults.html(opts.name, opts.inviteLink, opts.interview);
    text = defaults.text(opts.name, opts.inviteLink, opts.interview);
  }

  const result = await sendViaOrganizerConnection({
    organizerId: opts.organizerId,
    to: opts.to,
    subject,
    html,
    text,
  });

  if (result.ok) return { ok: true };
  if (result.code === "NO_CONNECTION") {
    return { ok: false, message: CONNECT_GOOGLE };
  }
  return { ok: false, message: result.error || "Could not send the email." };
}

export { CONNECT_GOOGLE as RECRUITMENT_CONNECT_GOOGLE_MSG };
