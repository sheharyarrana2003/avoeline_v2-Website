"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { getCertsOfEventByRegistration } from "@/src/features/certificates/certificates.service";
import { DRIVE_SHARE_WARNING } from "@/src/features/certificates/certificateEmail";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import {
  enqueueBatch,
  type ResolvedRecipient,
} from "@/src/features/connections/server/batch.service";
import { findActiveEmailConnection } from "@/src/features/connections/server/connections.service";

const schema = z.object({
  eventId: z.string().min(1),
  resend: z.boolean().optional(),
  /** Opt-in: share Drive archive by link and include URL in email. */
  includeDriveLink: z.boolean().optional(),
  /** Must be true when includeDriveLink is true (UI warning acknowledged). */
  acknowledgeDriveShareWarning: z.boolean().optional(),
});

export const emailCertificatesAction = safeAction({
  input: schema,
  run: async (input) => {
    const limited = rateLimit(`cert:email:${input.eventId}`, 5, 120);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many email sends. Retry in ${limited.retryAfterSec}s.`);
    }

    const event = await assertOwnedEvent(input.eventId);
    if (!event) return safeFail("FORBIDDEN", "You cannot send certificates for that event.");

    const allowed = await hasModuleAccess(event.organizerId, "certificates");
    if (!allowed)
      return safeFail("MODULE", "Certificates module is not enabled for this organizer.");

    const includeDriveLink = Boolean(input.includeDriveLink);
    if (includeDriveLink && !input.acknowledgeDriveShareWarning) {
      return safeFail("VALIDATION", DRIVE_SHARE_WARNING);
    }

    const conn = await findActiveEmailConnection({
      ownerType: "user",
      ownerId: event.organizerId,
    });
    if (!conn) {
      return safeFail(
        "NO_CONNECTION",
        "Connect Gmail before emailing certificates (Organizer → Connections).",
      );
    }

    const [certsByRegistration, regs] = await Promise.all([
      getCertsOfEventByRegistration(input.eventId),
      RegService.getRegsOfEvent(input.eventId),
    ]);

    if (!certsByRegistration.size) {
      return safeFail("EMPTY", "No certificates have been issued for this event yet.");
    }

    const usersById = regs.length
      ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
      : new Map();

    const emailByRegistration = new Map<string, { email: string; name: string; userId: string }>();
    for (const reg of regs) {
      const user = usersById.get(String(reg.userId));
      const email = (user?.email || reg.attendee?.email || "").trim();
      if (email) {
        emailByRegistration.set(String(reg.registrationId), {
          email,
          name: user?.profile?.fullName || reg.attendee?.name || "",
          userId: String(reg.userId || ""),
        });
      }
    }

    const resend = Boolean(input.resend);
    const recipients: ResolvedRecipient[] = [];
    let noAddress = 0;

    for (const [registrationId, cert] of certsByRegistration) {
      if (cert.status === "revoked") continue;
      if (!resend && cert.emailedAt) continue;
      const contact = emailByRegistration.get(String(registrationId));
      if (!contact) {
        noAddress += 1;
        continue;
      }
      recipients.push({
        email: contact.email,
        registrationId: String(registrationId),
        userId: contact.userId || undefined,
      });
    }

    if (!recipients.length) {
      return noAddress
        ? safeFail(
            "NO_ADDRESS",
            `Nothing to send. ${noAddress} certificate${noAddress === 1 ? " has" : "s have"} no email address on the registration.`,
          )
        : safeFail(
            "EMPTY",
            resend
              ? "There are no certificates to send."
              : "Everyone with a certificate has already been emailed.",
          );
    }

    if (includeDriveLink) {
      const { enqueueCertificateJobs } = await import("../certificateJobs.service");
      const needShare = [...certsByRegistration.values()]
        .filter((c) => recipients.some((r) => r.registrationId === c.registrationId))
        .filter((c) => !c.driveShareUrl)
        .map((c) => c.id);
      if (needShare.length) {
        await enqueueCertificateJobs({
          eventId: input.eventId,
          certificateIds: needShare,
          kind: "share",
        });
      }
    }

    try {
      const result = await enqueueBatch({
        ownerId: event.organizerId,
        kind: "certificate",
        subject: "Your certificate",
        recipients,
        mode: "send_and_schedule",
        eventId: input.eventId,
        connectionId: conn.id,
        createdBy: event.organizerId,
        deferSendNowToOutbox: true,
        payloadExtra: { includeDriveLink },
      });

      revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/certificates`);
      return safeOk({
        sent: result.sentNow,
        queued: result.queued,
        skipped: noAddress,
        failed: 0,
        batchId: result.batchId,
        success: true as const,
        message:
          result.queued > 0
            ? `Queued ${result.queued} certificate email${result.queued === 1 ? "" : "s"} (docs/18 capacity).`
            : "Certificate emails enqueued.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not queue certificate emails.";
      return safeFail("CAPACITY", message);
    }
  },
});

/** Legacy ActionResult-shaped wrapper for older form call sites. */
export async function emailCertificatesLegacy(
  eventId: string,
  resend = false,
  opts?: { includeDriveLink?: boolean; acknowledgeDriveShareWarning?: boolean },
) {
  const result = await emailCertificatesAction({
    eventId,
    resend,
    includeDriveLink: opts?.includeDriveLink,
    acknowledgeDriveShareWarning: opts?.acknowledgeDriveShareWarning,
  });
  if (!result.ok) return { success: false as const, error: result.error.message };
  return {
    success: true as const,
    sent: result.data.sent,
    queued: result.data.queued,
    skipped: result.data.skipped,
    ...(result.data.message ? { message: result.data.message } : {}),
  };
}
