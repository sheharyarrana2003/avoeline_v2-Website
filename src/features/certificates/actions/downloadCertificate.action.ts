"use server";

import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import type { ExportResult } from "@/src/features/exports/types";

/**
 * Sign one certificate's PDF, once the caller has been authorized.
 *
 * The file lives in the private certificates bucket, so the stored value is a
 * storage key and the URL is signed per request. Same reasoning as the exports:
 * the link expires on its own rather than leaving somebody's certificate
 * permanently fetchable by anyone who once saw the address.
 *
 * Shared by both download paths below so the filename, the signing and the
 * download count are decided once. `decide` is where they differ: it receives
 * the stored document and says whether this caller may have it.
 */
async function signStoredPdf(
    certificateId: string,
    label: string,
    decide: (data: DocumentData) => Promise<ExportResult | null> | ExportResult | null,
): Promise<ExportResult> {
    const id = String(certificateId ?? "").trim();
    if (!id) return { success: false, error: "Missing certificate." };

    const snap = await adminDb.collection(COLLECTIONS.CERTIFICATES).doc(id).get();
    if (!snap.exists) return { success: false, error: "That certificate no longer exists." };

    const data = snap.data() ?? {};
    const refusal = await decide(data);
    if (refusal) return refusal;

    {
        const path = String(data.digital?.pdfPath ?? "");
        if (!path) {
            return {
                success: false,
                error: "This certificate has no PDF yet. Ask the organizer to re-issue it.",
            };
        }

        const recipient = String(data.content?.recipientName ?? "certificate")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "certificate";
        const filename = `certificate-${recipient}-${id}.pdf`;

        const url = await getSignedUrl(CERTIFICATES_BUCKET, path, 3600, filename);

        // Counted so an organizer can see a certificate was actually collected.
        // Never allowed to fail the download.
        adminDb
            .collection(COLLECTIONS.CERTIFICATES)
            .doc(id)
            .set(
                { digital: { ...(data.digital ?? {}), downloadCount: Number(data.digital?.downloadCount ?? 0) + 1, lastDownloaded: new Date() } },
                { merge: true },
            )
            .catch((err: unknown) => console.error(`[${label}] could not record the download`, err));

        return { success: true, url, filename };
    }
}

/**
 * The signed-in download: for the person the certificate belongs to, and for
 * the organizer of the event that issued it.
 *
 * The certificate is re-read and the ownership decided from what is stored,
 * never from the request.
 */
export async function downloadCertificate(certificateId: string): Promise<ExportResult> {
    try {
        return await signStoredPdf(certificateId, "downloadCertificate", async (data) => {
            const user = await AuthService.getCurrentUser();
            if (!user?.userId) return { success: false, error: "Please sign in again." };

            const isRecipient = String(data.userId) === user.userId;
            const isIssuer = String(data.organizerId) === user.userId;
            if (!isRecipient && !isIssuer) {
                console.warn("[downloadCertificate] refused", { certificateId, caller: user.userId });
                return { success: false, error: "That certificate is not yours." };
            }
            return null;
        });
    } catch (err) {
        console.error("[downloadCertificate]", err);
        return { success: false, error: "Could not prepare that download. Please try again." };
    }
}

/**
 * The unauthenticated download, from the public verification page.
 *
 * Deliberately open, and safe for the same reason that page is: it discloses
 * exactly what the page already shows -- holder, event, role, issue date, id --
 * and reaching either needs the certificate's unguessable Firestore id. An
 * emailed certificate has to work for someone with no account, and the
 * alternative, a link that only resolves while signed in, would strand every
 * account-less registrant with a certificate they cannot collect.
 *
 * A revoked certificate is refused: the page says it was withdrawn, so handing
 * over the document anyway would contradict it.
 */
export async function downloadCertificatePublicly(certificateId: string): Promise<ExportResult> {
    try {
        return await signStoredPdf(certificateId, "downloadCertificatePublicly", (data) =>
            data.status === "revoked"
                ? { success: false, error: "This certificate was revoked and can no longer be downloaded." }
                : null,
        );
    } catch (err) {
        console.error("[downloadCertificatePublicly]", err);
        return { success: false, error: "Could not prepare that download. Please try again." };
    }
}
