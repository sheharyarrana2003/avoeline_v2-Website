"use server";

import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import type { ExportResult } from "@/src/features/exports/actions/exportAttendees.action";

/**
 * Hand back a short-lived link to a certificate's PDF.
 *
 * The file lives in the private certificates bucket, so the stored value is a
 * storage key and the URL is signed per request. Same reasoning as the exports:
 * the link expires on its own rather than leaving somebody's certificate
 * permanently fetchable by anyone who once saw the address.
 *
 * Authorized for the person the certificate belongs to, and for the organizer
 * of the event that issued it. The certificate is re-read here and the
 * ownership decided from what is stored, never from the request.
 */
export async function downloadCertificate(certificateId: string): Promise<ExportResult> {
    try {
        const id = String(certificateId ?? "").trim();
        if (!id) return { success: false, error: "Missing certificate." };

        const user = await AuthService.getCurrentUser();
        if (!user?.userId) return { success: false, error: "Please sign in again." };

        const snap = await adminDb.collection(COLLECTIONS.CERTIFICATES).doc(id).get();
        if (!snap.exists) return { success: false, error: "That certificate no longer exists." };

        const data = snap.data() ?? {};
        const isRecipient = String(data.userId) === user.userId;
        const isIssuer = String(data.organizerId) === user.userId;
        if (!isRecipient && !isIssuer) {
            console.warn("[downloadCertificate] refused", { id, caller: user.userId });
            return { success: false, error: "That certificate is not yours." };
        }

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
            .catch((err: unknown) => console.error("[downloadCertificate] could not record the download", err));

        return { success: true, url, filename };
    } catch (err) {
        console.error("[downloadCertificate]", err);
        return { success: false, error: "Could not prepare that download. Please try again." };
    }
}
