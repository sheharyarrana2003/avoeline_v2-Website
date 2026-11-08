"use server";

import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { uploadEventAssetToOrganizerDrive } from "@/src/features/connections/server/eventDriveUpload.service";

const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Organizer event banner/gallery/speaker/sponsor media → Drive Media folder (Phase A).
 */
export const uploadEventMediaDriveAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(3).max(120),
    contentBase64: z.string().min(8).max(70_000_000),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) return safeFail("AUTH", "Sign in to upload.");

    const limited = rateLimit(`event-drive-media:${user.userId}`, 30, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many uploads. Try again in ${limited.retryAfterSec}s.`);
    }

    const event = await assertOwnedEvent(input.eventId);
    if (!event) return safeFail("FORBIDDEN", "You cannot upload media for that event.");

    const mime = input.contentType.toLowerCase();
    if (!mime.startsWith("image/") && !mime.startsWith("video/") && mime !== "application/pdf") {
      return safeFail("VALIDATION", "Use an image, video, or PDF.");
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(input.contentBase64, "base64");
    } catch {
      return safeFail("VALIDATION", "Invalid file data.");
    }
    if (!bytes.length || bytes.length > MAX_BYTES) {
      return safeFail("VALIDATION", "That file is empty or larger than 50MB.");
    }

    try {
      const uploaded = await uploadEventAssetToOrganizerDrive({
        organizerId: event.organizerId,
        eventId: input.eventId,
        kind: "media",
        fileName: input.fileName,
        mimeType: mime,
        bytes,
        actorId: user.userId,
      });
      return safeOk({
        url: uploaded.webUrl || uploaded.storageRef,
        path: uploaded.storageRef,
        providerFileId: uploaded.providerFileId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload to Drive.";
      return safeFail("UPLOAD", message);
    }
  },
});
