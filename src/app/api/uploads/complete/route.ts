import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { assertEventActor, assertParticipant } from "@/src/features/events/ownership";
import { assertOrganizerDriveAndGmail } from "@/src/features/connections/server/assertOrganizerDriveAndGmail";
import { recordDriveComplete } from "@/src/features/files/fileStore";
import { driveVerifyUploadedFile } from "@/src/features/files/DriveStore";
import { isBlockedExecutable } from "@/src/features/files/validateUpload";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import type { EventFolderKind } from "@/src/features/files/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  eventId: z.string().uuid(),
  providerFileId: z.string().min(5).max(128),
  fileName: z.string().min(1).max(200),
  mime: z.string().min(3).max(120),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(200 * 1024 * 1024),
  category: z.enum(["payment_proof", "submission", "media", "certificate", "export", "other"]),
  folderKind: z.enum(["payment_proofs", "certificates", "media", "exports", "submissions"]),
  entityType: z.string().min(1).max(64).optional(),
  entityId: z.string().min(1).max(80).optional(),
  registrationId: z.string().uuid().optional(),
  connectionId: z.string().uuid().optional(),
});

/**
 * After browser finishes resumable PUT to Drive: verify metadata and insert stored_files.
 */
export async function POST(req: NextRequest) {
  const user = await AuthService.getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const limited = rateLimit(`uploads-complete:${user.userId}`, 30, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests.", retryAfterSec: limited.retryAfterSec },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid complete request." }, { status: 400 });
  }
  const input = parsed.data;

  if (isBlockedExecutable({ name: input.fileName, mime: input.mime })) {
    return NextResponse.json(
      { ok: false, error: "That file type is not allowed." },
      { status: 400 },
    );
  }

  let organizerId = "";
  const asStaff =
    (await assertEventActor(input.eventId, "files")) ||
    (await assertEventActor(input.eventId, "overview"));
  if (asStaff) {
    organizerId = asStaff.organizerId;
  } else if (input.registrationId) {
    const part = await assertParticipant(input.eventId, input.registrationId);
    if (!part) {
      return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
    }
    organizerId = part.event.organizerId;
  } else {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }

  const gate = await assertOrganizerDriveAndGmail(organizerId);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: 403 });
  }
  const connectionId = input.connectionId || gate.driveConnectionId;

  try {
    const meta = await driveVerifyUploadedFile(connectionId, input.providerFileId);
    if (meta.size != null && meta.size !== input.size) {
      return NextResponse.json(
        { ok: false, error: "Uploaded size does not match." },
        { status: 400 },
      );
    }
    if (isBlockedExecutable({ name: meta.name, mime: meta.mimeType })) {
      return NextResponse.json(
        { ok: false, error: "That file type is not allowed." },
        { status: 400 },
      );
    }

    const recorded = await recordDriveComplete({
      connectionId,
      organizerId,
      eventId: input.eventId,
      providerFileId: input.providerFileId,
      name: meta.name || input.fileName,
      mime: meta.mimeType || input.mime,
      size: input.size,
      category: input.category,
      entityType: input.entityType || "event",
      entityId: input.entityId || input.eventId,
      folderKind: input.folderKind as EventFolderKind,
      actorId: user.userId,
      linkLibrary: input.category !== "payment_proof",
    });

    return NextResponse.json({ ok: true, fileId: recorded.fileId });
  } catch (err) {
    logger.error("[uploads/complete]", { err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not complete upload." },
      { status: 502 },
    );
  }
}
