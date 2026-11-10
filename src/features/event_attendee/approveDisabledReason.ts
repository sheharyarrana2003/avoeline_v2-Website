import type { RegistrationStatus } from "@/src/services/models/reg.type";

export type ApproveDisabledInput = {
  isPaid: boolean;
  status: RegistrationStatus | string;
  proofPath?: string | null;
  paymentStatus?: string | null;
};

/**
 * When Approve should be disabled on the attendees list/drawer.
 * Returns a human tooltip, or null when Approve is allowed.
 */
export function approveDisabledReason(input: ApproveDisabledInput): string | null {
  const status = String(input.status || "");
  if (status !== "pending" && status !== "awaiting_payment") return null;
  if (!input.isPaid) return null;
  const proof = String(input.proofPath || "").trim();
  if (!proof) return "No payment proof yet";
  return null;
}

/** Platform proxy URL for FileStore payment proofs (`file:{uuid}`). */
export function paymentProofPlatformUrl(proofPath: string | null | undefined): string | null {
  const path = String(proofPath || "").trim();
  if (!path) return null;
  if (path.startsWith("/api/files/")) return path;
  if (path.startsWith("file:")) {
    const id = path.slice("file:".length).trim();
    return id ? `/api/files/${id}` : null;
  }
  return null;
}

export function storedFileIdFromProofPath(proofPath: string | null | undefined): string | null {
  const path = String(proofPath || "").trim();
  if (path.startsWith("file:")) {
    const id = path.slice("file:".length).trim();
    return id || null;
  }
  if (path.startsWith("/api/files/")) {
    const id = path.slice("/api/files/".length).split(/[/?#]/)[0] || "";
    return id || null;
  }
  return null;
}
