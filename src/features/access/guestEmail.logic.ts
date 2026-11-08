import { inviteDisplayStatus, type EventInvite, type InviteDisplayStatus } from "./types";

export type GuestEmailFilter =
  "all_pending" | "selected" | "not_opened" | "not_registered" | "failed_or_pending_resend";

export type GuestEmailRow = Pick<
  EventInvite,
  | "id"
  | "email"
  | "name"
  | "kind"
  | "token"
  | "openedAt"
  | "registeredAt"
  | "revokedAt"
  | "expiresAt"
  | "singleUse"
> & {
  lastEmailStatus?: "sent" | "failed" | "pending" | null;
};

/** Replace {{inviteLink}}, {{eventLink}}, {{name}}, {{email}} in subject/body. */
export function applyGuestEmailTokens(
  template: string,
  vars: { inviteLink: string; eventLink: string; name: string; email: string },
): string {
  return template
    .replaceAll("{{inviteLink}}", vars.inviteLink)
    .replaceAll("{{eventLink}}", vars.eventLink)
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{email}}", vars.email);
}

export function guestLinkFor(
  guest: Pick<GuestEmailRow, "kind" | "token">,
  eventUrl: string,
): string {
  if (guest.kind === "invite" && guest.token) {
    const base = eventUrl.split("?")[0];
    return `${base}?invite=${guest.token}`;
  }
  return eventUrl.split("?")[0];
}

export function filterGuestRecipients(
  guests: GuestEmailRow[],
  filter: GuestEmailFilter,
  selectedIds: string[] = [],
  now = Date.now(),
): GuestEmailRow[] {
  const selected = new Set(selectedIds);
  return guests.filter((g) => {
    const status: InviteDisplayStatus = inviteDisplayStatus(g as EventInvite, now);
    if (status === "revoked" || status === "expired") return false;
    switch (filter) {
      case "selected":
        return selected.has(g.id);
      case "all_pending":
        return g.kind === "invite" ? status === "pending" : status === "not_registered";
      case "not_opened":
        return g.kind === "invite" && status === "pending";
      case "not_registered":
        return status === "pending" || status === "opened" || status === "not_registered";
      case "failed_or_pending_resend":
        return g.lastEmailStatus === "failed" || g.lastEmailStatus === "pending";
      default:
        return false;
    }
  });
}

/** Simple HTML preview (escaped plaintext + link line). */
export function previewGuestEmailHtml(
  subject: string,
  body: string,
  sample: { inviteLink: string; eventLink: string; name: string; email: string },
): { subject: string; html: string } {
  const subj = applyGuestEmailTokens(subject, sample);
  const text = applyGuestEmailTokens(body, sample);
  const escaped = text
    .split(/\n/)
    .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");
  const link = sample.inviteLink || sample.eventLink;
  const html = `${escaped}<p><a href="${link.replace(/"/g, "&quot;")}">Open link</a></p>`;
  return { subject: subj, html };
}
