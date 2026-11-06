import type { ConnectionCapability, IntegrationCatalogEntry } from "./types";

const NEVER_COPY =
  "We never read your inbox, never read files you didn't choose, and you can disconnect any time.";

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    key: "email.send",
    name: "Gmail: send from your address",
    benefit:
      "Registration confirmations, bulk and custom emails, invites, certificates and all event mail go out from your address. They show in your Sent folder, replies reach your inbox, and it costs nothing.",
    allows: ["Send emails on your behalf"],
    never: [NEVER_COPY],
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    tier: "sensitive",
    planGate: null,
    active: true,
  },
  {
    key: "calendar",
    name: "Google Calendar",
    benefit:
      "Interviews, mentor slots, judging sessions and your events appear in your calendar with reminders.",
    allows: ["Create, update and delete the events the platform made"],
    never: [NEVER_COPY],
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    tier: "sensitive",
    planGate: null,
    active: true,
  },
  {
    key: "meet",
    name: "Google Meet",
    benefit: "One-click Meet links for interviews, workshops and online hackathon sessions.",
    allows: ["Same permission as Calendar (the link is created on a calendar event)"],
    never: [NEVER_COPY],
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    tier: "sensitive",
    planGate: null,
    active: true,
  },
  {
    key: "drive.files",
    name: "Google Drive, Docs, Sheets",
    benefit:
      "Attach or create Docs, Sheets and Slides for events, teams and clubs, and find them all in one Library.",
    allows: ["Open files you pick, and create files from the platform (never browse your Drive)"],
    never: [NEVER_COPY],
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    tier: "non-sensitive",
    planGate: "google_workspace_sync",
    active: true,
  },
  {
    key: "sheets.sync",
    name: "Live attendee sheet",
    benefit: "Keep a Google Sheet updated with registrations, teams and check-ins.",
    allows: ["Update the sheet the platform created"],
    never: [NEVER_COPY],
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    tier: "non-sensitive",
    planGate: "google_workspace_sync",
    active: true,
  },
];

export function getCatalogEntry(key: ConnectionCapability): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((e) => e.key === key);
}

export function requiredScopesForCapability(key: ConnectionCapability): string[] {
  const entry = getCatalogEntry(key);
  if (!entry) return [];
  return ["openid", "email", ...entry.scopes];
}

export function baseIdentityScopes(): string[] {
  return ["openid", "email"];
}

export type CatalogScope = "organizer" | "vendor" | "org" | "personal";

/** docs/17 §3 — which cards each owner sees. */
export function catalogForScope(scope: CatalogScope): IntegrationCatalogEntry[] {
  if (scope === "vendor") {
    return INTEGRATION_CATALOG.filter((e) =>
      (["email.send", "calendar", "meet", "drive.files"] as ConnectionCapability[]).includes(e.key),
    );
  }
  return INTEGRATION_CATALOG;
}
