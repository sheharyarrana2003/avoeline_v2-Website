/** Scopes / capabilities enabled when linking Google workspace on sign-in. */

import type { ConnectionCapability } from "../types";

export const WORKSPACE_OAUTH_CAPABILITY = "workspace" as const;

export const WORKSPACE_CAPABILITIES: ConnectionCapability[] = [
  "email.send",
  "calendar",
  "meet",
  "drive.files",
  "sheets.sync",
];

export const WORKSPACE_GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
] as const;

export function shouldBootstrapGoogleWorkspace(userType: string): boolean {
  const t = String(userType || "").toLowerCase();
  return t === "organizer" || t === "vendor";
}

export function isWorkspaceOAuthCapability(capability: string): boolean {
  return capability === WORKSPACE_OAUTH_CAPABILITY;
}
