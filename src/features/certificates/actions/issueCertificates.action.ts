"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import {
  issueCertificatesForRegistrations,
  BULK_CAP,
} from "@/src/features/certificates/certificates.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const issueSchema = z.object({
  eventId: z.string().min(1),
  registrationIds: z.array(z.string().min(1)).min(1).max(BULK_CAP),
  roles: z.record(z.string(), z.string()).optional(),
  /** Default on when Drive connected. */
  archiveToDrive: z.boolean().optional(),
});

export const issueCertificatesAction = safeAction({
  input: issueSchema,
  auth: async () => {
    return { label: "issueCertificates" };
  },
  run: async (input) => {
    const limited = rateLimit(`cert:issue:${input.eventId}`, 10, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many issue requests. Retry in ${limited.retryAfterSec}s.`);
    }

    const event = await assertOwnedEvent(input.eventId);
    if (!event) return safeFail("FORBIDDEN", "You cannot issue certificates for that event.");

    const allowed = await hasModuleAccess(event.organizerId, "certificates");
    if (!allowed)
      return safeFail("MODULE", "Certificates module is not enabled for this organizer.");

    try {
      const result = await issueCertificatesForRegistrations({
        eventId: input.eventId,
        organizerId: event.organizerId,
        registrationIds: input.registrationIds,
        roles: input.roles,
        archiveToDrive: input.archiveToDrive,
      });

      revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/certificates`);
      const archiveNote =
        result.archiveQueued > 0 ? ` Drive archive queued for ${result.archiveQueued}.` : "";
      return safeOk({
        success: true as const,
        count: result.issued,
        failedCount: result.skipped,
        message:
          result.issued > 0
            ? `Issued ${result.issued} certificate${result.issued === 1 ? "" : "s"}${result.skipped ? ` (${result.skipped} skipped)` : ""}.${archiveNote}`
            : result.skipped
              ? `Nothing new to issue (${result.skipped} already issued or ineligible).`
              : "Nothing to issue.",
        results: [] as const,
      });
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "ISSUE";
      const message = err instanceof Error ? err.message : "Could not issue certificates.";
      if (code === "NO_DRIVE" || code === "NO_GMAIL" || code === "NO_BOTH") {
        return safeFail(code, message);
      }
      return safeFail("ISSUE", message);
    }
  },
});
