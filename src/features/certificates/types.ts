import type { CertificateData, CertificateLayout, TemplateAssets } from "./layout.types";

export type CertificateStatus = "issued" | "revoked";
export type TemplateStatus = "draft" | "published";

export const CERTIFICATE_ROLES = [
  "Attendee",
  "Winner",
  "Speaker",
  "Volunteer",
  "Organizer",
] as const;
export type CertificateRole = (typeof CERTIFICATE_ROLES)[number];

export type CertificateRow = {
  id: string;
  eventId: string;
  organizerId: string;
  templateId: string | null;
  templateVersion: number;
  registrationId: string | null;
  userId: string | null;
  certificateNumber: string;
  verificationCode: string;
  data: CertificateData;
  status: CertificateStatus;
  issuedAt: string | null;
  downloadCount: number;
  verificationCount: number;
  emailedAt: string | null;
  /** Private FileStore / Drive archive ref (proxy URL). Not shared by default. */
  driveUrl: string | null;
  /** Anyone-with-link Drive URL when organizer opted into email Drive link. */
  driveShareUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CertificateGenerationAttendeeResult = {
  userId: string;
  registrationId: string;
  recipientName: string;
  success: boolean;
  error?: string;
};

export type CertificateGenerationResult = {
  success: boolean;
  count: number;
  failedCount: number;
  message: string;
  results: CertificateGenerationAttendeeResult[];
};

export type CertificateTemplateRow = {
  id: string;
  eventId: string | null;
  organizerId: string;
  name: string;
  version: number;
  layout: CertificateLayout;
  assets: TemplateAssets;
  status: TemplateStatus;
  emailAttachPdf: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

/** @deprecated alias for older imports — same as CertificateRow */
export type CertificateDocument = CertificateRow;
