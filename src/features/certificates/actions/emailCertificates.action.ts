"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import {
  getCertsOfEventByRegistration,
  getTemplateForEvent,
  markCertificatesEmailed,
  renderCertPdfBytes,
} from "@/src/features/certificates/certificates.service";
import { buildCertificateEmail } from "@/src/features/certificates/certificateEmail";
import type { CertificateRow } from "@/src/features/certificates/types";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { OrganizerService } from "@/src/services/organizer.service";
import { absoluteUrl } from "@/src/lib/appUrl";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";
import { hasActiveOrganizerEmailConnection } from "@/src/features/email/organizerEmailConnection.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const schema = z.object({
  eventId: z.string().min(1),
  resend: z.boolean().optional(),
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

    const connected = await hasActiveOrganizerEmailConnection(event.organizerId);
    if (!connected) {
      return safeFail(
        "NO_CONNECTION",
        "Connect Google or SMTP before emailing certificates (Organizer → Email connection).",
      );
    }

    const [certsByRegistration, regs, template] = await Promise.all([
      getCertsOfEventByRegistration(input.eventId),
      RegService.getRegsOfEvent(input.eventId),
      getTemplateForEvent(input.eventId),
    ]);

    if (!certsByRegistration.size) {
      return safeFail("EMPTY", "No certificates have been issued for this event yet.");
    }

    const usersById = regs.length
      ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
      : new Map();

    const emailByRegistration = new Map<string, { email: string; name: string }>();
    for (const reg of regs) {
      const user = usersById.get(String(reg.userId));
      const email = (user?.email || reg.attendee?.email || "").trim();
      if (email) {
        emailByRegistration.set(String(reg.registrationId), {
          email,
          name: user?.profile?.fullName || reg.attendee?.name || "",
        });
      }
    }

    // Link-first: PDF attach is opt-in on the template (default false).
    const attachPdf = template?.emailAttachPdf === true;
    const resend = Boolean(input.resend);
    const outgoing: { certId: string; code: string; to: string; cert: CertificateRow }[] = [];
    let noAddress = 0;

    for (const [registrationId, cert] of certsByRegistration) {
      if (cert.status === "revoked") continue;
      if (!resend && cert.emailedAt) continue;
      const contact = emailByRegistration.get(String(registrationId));
      if (!contact) {
        noAddress += 1;
        continue;
      }
      outgoing.push({
        certId: cert.id,
        code: cert.verificationCode,
        to: contact.email,
        cert,
      });
    }

    if (!outgoing.length) {
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

    const { findActiveEmailConnection } =
      await import("@/src/features/connections/server/connections.service");
    const { getCapacity } = await import("@/src/features/connections/server/capacity.service");
    const conn = await findActiveEmailConnection({
      ownerType: "user",
      ownerId: event.organizerId,
    });
    if (conn) {
      const capacity = await getCapacity({
        connection: conn,
        ownerId: event.organizerId,
        kind: "certificate",
        eventId: input.eventId,
      });
      const cap = Math.min(capacity.maxPerSend, Math.max(0, capacity.remainingBulk));
      if (cap < 1) {
        return safeFail(
          "CAPACITY",
          "No bulk send capacity left today. Wait for slots to free up or schedule from Settings → Sent emails.",
        );
      }
      outgoing.splice(cap);
    }

    const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
    const replyTo = organizer?.contact?.primaryEmail?.trim();

    let sent = 0;
    let failed = 0;
    const stamped: string[] = [];

    for (const item of outgoing) {
      const downloadUrl = await absoluteUrl(`/certificate/${item.code}/download`);
      const verifyUrl = await absoluteUrl(`/verify/${item.code}`);
      const built = buildCertificateEmail(item.cert, verifyUrl, downloadUrl);

      let attachments: { filename: string; content: Uint8Array; contentType: string }[] | undefined;
      if (attachPdf) {
        try {
          const bytes = await renderCertPdfBytes(item.cert);
          const safeName =
            (item.cert.data.recipient_name || "certificate")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || "certificate";
          attachments = [
            {
              filename: `certificate-${safeName}.pdf`,
              content: bytes,
              contentType: "application/pdf",
            },
          ];
        } catch (err) {
          console.error("[emailCertificatesAction] PDF attach failed", err);
        }
      }

      const outcome = await sendViaOrganizerConnection({
        organizerId: event.organizerId,
        to: item.to,
        subject: built.subject,
        html: built.html,
        text: built.text,
        kind: "certificate",
        ...(replyTo ? { replyTo } : {}),
        ...(attachments ? { attachments } : {}),
      });

      if (outcome.ok) {
        sent += 1;
        stamped.push(item.certId);
      } else if (outcome.code === "NO_CONNECTION") {
        return safeFail(
          "NO_CONNECTION",
          "Connect Google or SMTP before emailing certificates (Organizer → Email connection).",
        );
      } else {
        failed += 1;
      }
    }

    if (stamped.length) {
      await markCertificatesEmailed(stamped).catch((err: unknown) =>
        console.error("[emailCertificatesAction] sent but could not record emailedAt", err),
      );
    }

    if (!sent) {
      return safeFail("PROVIDER", "The mail provider rejected the send. Nothing went out.");
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/certificates`);
    return safeOk({
      sent,
      skipped: noAddress,
      failed,
      success: true as const,
    });
  },
});

/** Legacy ActionResult-shaped wrapper for older form call sites. */
export async function emailCertificatesLegacy(eventId: string, resend = false) {
  const result = await emailCertificatesAction({ eventId, resend });
  if (!result.ok) return { success: false as const, error: result.error.message };
  return {
    success: true as const,
    sent: result.data.sent,
    skipped: result.data.skipped,
    ...(result.data.failed ? { error: `${result.data.failed} could not be delivered.` } : {}),
  };
}
