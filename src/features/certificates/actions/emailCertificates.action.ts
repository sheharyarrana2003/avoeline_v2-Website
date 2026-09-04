"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { CertificateService } from "@/src/services/certificate.service";
import { OrganizerService } from "@/src/services/organizer.service";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { sendBulkEmail, type Recipient } from "@/src/lib/email";
import { absoluteUrl } from "@/src/lib/appUrl";
import { type ActionResult, fail } from "@/src/lib/action";
import { buildCertificateEmail } from "@/src/features/certificates/certificateEmail";
import type { CertificateDocument } from "@/src/services/models/certificate.model";

/**
 * Spec 6.1: send every issued certificate to the person it belongs to.
 *
 * One send per event, not per attendee -- `sendBulkEmail` puts each recipient in
 * their own messageVersion, so nobody's address is disclosed to anybody else,
 * and 500 attendees is one request rather than 500. Each version carries its own
 * body because each certificate has its own link.
 *
 * `resend` decides who is included: by default only certificates that have never
 * been emailed, so pressing the button twice does not mail everyone again. A
 * revoked certificate is never sent, and neither is one still generating.
 *
 * The recipient's address is not stored on the certificate, so it is joined from
 * the registration -- which is also the only place an account-less registrant's
 * address exists at all.
 */
export async function emailCertificatesAction(eventId: string, resend = false): Promise<ActionResult & { sent?: number; skipped?: number }> {
    try {
        // These are outward-facing emails to attendees, so ownership is the whole
        // boundary and nothing is read before it passes.
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot send certificates for that event.");

        const certsByRegistration = await CertificateService.getCertsOfEventByRegistration(eventId);
        if (!certsByRegistration.size) return fail("No certificates have been issued for this event yet.");

        const regs = await RegService.getRegsOfEvent(eventId);
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

        const outgoing: { cert: CertificateDocument; to: Recipient; verifyUrl: string }[] = [];
        let noAddress = 0;

        for (const [registrationId, cert] of certsByRegistration) {
            if (cert.status === "revoked" || cert.status === "generating") continue;
            if (!resend && cert.emailedAt) continue;

            const contact = emailByRegistration.get(String(registrationId));
            if (!contact) {
                noAddress += 1;
                continue;
            }
            outgoing.push({
                cert,
                to: { email: contact.email, name: contact.name || cert.content?.recipientName || undefined },
                verifyUrl: await absoluteUrl(`/verify/${cert.certificateId}`),
            });
        }

        if (!outgoing.length) {
            return noAddress
                ? fail(`Nothing to send. ${noAddress} certificate${noAddress === 1 ? " has" : "s have"} no email address on the registration.`)
                : fail(resend ? "There are no certificates to send." : "Everyone with a certificate has already been emailed.");
        }

        // Shown as the organizer, sent as us -- same SPF/DKIM reasoning as the
        // registration email; this only supplies the display name and reply-to.
        const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(() => null);
        const organizerName = organizer?.organization?.name?.trim();
        const organizerEmail = organizer?.contact?.primaryEmail?.trim();

        const byEmail = new Map(outgoing.map((o) => [o.to.email.toLowerCase(), o]));
        // The first recipient's message is the top-level body, which Brevo
        // requires; every version then overrides it with its own.
        const first = buildCertificateEmail(outgoing[0].cert, outgoing[0].verifyUrl);

        const outcome = await sendBulkEmail(
            outgoing.map((o) => o.to),
            {
                subject: first.subject,
                html: first.html,
                text: first.text,
                senderName: organizerName,
                ...(organizerEmail ? { replyTo: { email: organizerEmail, name: organizerName } } : {}),
            },
            {
                personalize: (recipient) => {
                    const own = byEmail.get(recipient.email.toLowerCase());
                    if (!own) return {};
                    const built = buildCertificateEmail(own.cert, own.verifyUrl);
                    return { subject: built.subject, html: built.html, text: built.text };
                },
            },
        );

        if (outcome.skipped) {
            return fail("Email is not configured on this deployment, so nothing was sent.");
        }
        if (!outcome.sent) {
            return fail("The mail provider rejected the send. Nothing went out.");
        }

        // Recorded only for a send that genuinely succeeded, so "not emailed" on
        // the screen never means "emailed and failed". A failed write here must
        // not report the send as failed -- the mail has already gone.
        const stampedAt = new Date();
        const batch = adminDb.batch();
        for (const { cert } of outgoing) {
            batch.set(
                adminDb.collection(COLLECTIONS.CERTIFICATES).doc(cert.certificateId),
                { emailedAt: stampedAt, updatedAt: stampedAt },
                { merge: true },
            );
        }
        await batch.commit().catch((err: unknown) =>
            console.error("[emailCertificatesAction] sent but could not record emailedAt", err),
        );

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/certificates`);
        return {
            success: true,
            sent: outcome.sent,
            skipped: noAddress,
            ...(outcome.failed ? { error: `${outcome.failed} could not be delivered.` } : {}),
        };
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[emailCertificatesAction]", err);
        return fail("Could not send the certificates. Please try again.");
    }
}
