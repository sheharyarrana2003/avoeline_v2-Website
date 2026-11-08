/** Pure gate outcomes for organizer Drive + Gmail hard-require (Phase A). */

export type OrganizerDriveGmailCode = "OK" | "NO_DRIVE" | "NO_GMAIL" | "NO_BOTH";

export type OrganizerDriveGmailFacts = {
  hasDrive: boolean;
  hasGmail: boolean;
};

export function classifyOrganizerDriveGmail(
  facts: OrganizerDriveGmailFacts,
): OrganizerDriveGmailCode {
  if (facts.hasDrive && facts.hasGmail) return "OK";
  if (!facts.hasDrive && !facts.hasGmail) return "NO_BOTH";
  if (!facts.hasDrive) return "NO_DRIVE";
  return "NO_GMAIL";
}

export function organizerDriveGmailMessage(code: Exclude<OrganizerDriveGmailCode, "OK">): string {
  switch (code) {
    case "NO_DRIVE":
      return "Connect Google Drive in Connections when this event collects files, payment proofs, or certificate archives.";
    case "NO_GMAIL":
      return "Connect Gmail in Connections before registration emails or certificate emails can send.";
    case "NO_BOTH":
      return "Connect Google Drive and Gmail in Connections when this event needs file storage or outbound email.";
  }
}
