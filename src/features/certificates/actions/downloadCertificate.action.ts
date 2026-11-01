"use server";

import { absoluteUrl } from "@/src/lib/appUrl";
import {
  getCertificateByCode,
  getCertificateById,
} from "@/src/features/certificates/certificates.service";
import type { ExportResult } from "@/src/features/exports/types";

/**
 * Returns the public on-demand PDF URL for a certificate.
 * PDFs are streamed from `/certificate/[code]/download` — nothing is stored.
 */
export async function downloadCertificate(certificateIdOrCode: string): Promise<ExportResult> {
  try {
    const key = String(certificateIdOrCode ?? "").trim();
    if (!key) return { success: false, error: "Missing certificate." };

    let cert = await getCertificateByCode(key);
    if (!cert) cert = await getCertificateById(key);
    if (!cert) return { success: false, error: "That certificate no longer exists." };
    if (cert.status === "revoked") {
      return {
        success: false,
        error: "This certificate was revoked and can no longer be downloaded.",
      };
    }

    const url = await absoluteUrl(`/certificate/${cert.verificationCode}/download`);
    const recipient =
      (cert.data.recipient_name || "certificate")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "certificate";
    return {
      success: true,
      url,
      filename: `certificate-${recipient}.pdf`,
    };
  } catch (err) {
    console.error("[downloadCertificate]", err);
    return { success: false, error: "Could not prepare that download. Please try again." };
  }
}

/** @deprecated Prefer linking to `/certificate/[code]/download` directly. */
export async function downloadCertificatePublicly(
  certificateIdOrCode: string,
): Promise<ExportResult> {
  return downloadCertificate(certificateIdOrCode);
}
