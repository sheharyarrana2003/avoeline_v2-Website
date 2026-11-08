"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { getPublicEvent } from "../registration.service";
import { fileStore } from "@/src/features/files/fileStore";
import { validateAndNormalizeProof } from "@/src/features/files/validateUpload";
import { publicFileUrl } from "@/src/features/files/storedFiles.repo";

/**
 * Public registration payment/file upload → FileStore (Drive first, fallback).
 * Prefers POST /api/uploads/proof from the client; this action remains for FormData flows.
 * Returns `file:{uuid}` storage ref (never raw Drive URLs).
 */
export const uploadRegistrationProofDriveAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(3).max(120),
    /** base64 without data: prefix */
    contentBase64: z.string().min(8).max(12_000_000),
  }),
  run: async (input) => {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const limited = rateLimit(`reg-drive-upload:${input.eventId}:${ip}`, 15, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", "Too many uploads. Try again shortly.");
    }

    const event = await getPublicEvent(input.eventId);
    if (!event) return safeFail("CLOSED", "This event is not open for registration.");
    if (event.requiresRegistration === false) {
      return safeFail("CLOSED", "This event does not take registrations.");
    }
    if (!isActiveLifecycle(eventLifecycle(event.status, event.schedule))) {
      return safeFail("CLOSED", "This event is not open for registration.");
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(input.contentBase64, "base64");
    } catch {
      return safeFail("VALIDATION", "Invalid file data.");
    }

    const normalized = await validateAndNormalizeProof({
      bytes,
      fileName: input.fileName,
      declaredMime: input.contentType,
    });
    if (!normalized.ok) {
      return safeFail("VALIDATION", normalized.error);
    }

    try {
      const put = await fileStore.put({
        name: normalized.name,
        mime: normalized.mime,
        bytes: normalized.bytes,
        checksum: normalized.checksum,
        category: "payment_proof",
        entityType: "event",
        entityId: input.eventId,
        organizerId: event.organizerId,
        eventId: input.eventId,
        folderKind: "payment_proofs",
        allowFallback: true,
        linkLibrary: false,
      });
      return safeOk({
        path: put.storageRef,
        fileId: put.fileId,
        webUrl: publicFileUrl(put.fileId),
        providerFileId: put.providerFileId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload file.";
      return safeFail("UPLOAD", message);
    }
  },
});
