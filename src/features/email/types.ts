/** Client-safe email connection status (no secrets). */

export type EmailConnectionProvider = "google" | "smtp";
export type EmailConnectionStatus = "active" | "revoked" | "error" | "pending";
export type EmailConnectionCreatedBy = "self" | "saas_owner";

export type OrganizerEmailConnectionPublic = {
  id: string;
  organizerId: string;
  provider: EmailConnectionProvider;
  fromEmail: string;
  fromName: string | null;
  status: EmailConnectionStatus;
  createdBy: EmailConnectionCreatedBy;
  googleAccountEmail: string | null;
  smtpHost: string | null;
  lastError: string | null;
  lastTestedAt: string | null;
  updatedAt: string;
};
