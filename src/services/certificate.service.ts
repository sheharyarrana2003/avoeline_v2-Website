import "server-only";

import {
  certsForUser,
  getCertificateByCode,
  getCertificateById,
  getCertsOfEventByRegistration,
  issueCertificatesForRegistrations,
  listCertificatesForEvent,
} from "@/src/features/certificates/certificates.service";
import type {
  CertificateGenerationResult,
  CertificateRow,
} from "@/src/features/certificates/types";

export type {
  CertificateGenerationAttendeeResult,
  CertificateGenerationResult,
} from "@/src/features/certificates/types";

/**
 * Thin facade over the Phase 5 certificates feature service.
 * Prefer importing from `@/src/features/certificates/certificates.service` directly.
 */
export const CertificateService = {
  getCertificateById,
  getCertificateByCode,
  listCertificatesForEvent,
  getCertsOfEventByRegistration,
  certsForUser,

  async generateCertificatesForEvent(
    eventId: string,
    organizerId: string,
    selectedRegistrationIds?: string[],
    rolesByRegistrationId?: Record<string, string>,
  ): Promise<CertificateGenerationResult> {
    const registrationIds = selectedRegistrationIds?.length ? selectedRegistrationIds : [];
    const result = await issueCertificatesForRegistrations({
      eventId,
      organizerId,
      registrationIds,
      roles: rolesByRegistrationId,
    });

    return {
      success: result.issued > 0 || result.skipped > 0,
      count: result.issued,
      failedCount: result.skipped,
      message:
        result.issued > 0
          ? `Issued ${result.issued} certificate${result.issued === 1 ? "" : "s"}.`
          : "No new certificates were issued.",
      results: [],
    };
  },
};

export type { CertificateRow };
