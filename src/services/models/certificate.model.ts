/**
 * Re-exports certificate domain types from the feature module.
 * Prefer importing from `@/src/features/certificates/types` for new code.
 */
export {
  CERTIFICATE_ROLES,
  type CertificateRole,
  type CertificateStatus,
  type CertificateRow,
  type CertificateTemplateRow,
  type CertificateDocument,
  type CertificateGenerationAttendeeResult,
  type CertificateGenerationResult,
} from "@/src/features/certificates/types";

/** @deprecated Certificates are always digital (on-demand PDF). */
export type CertificateType = "digital";
