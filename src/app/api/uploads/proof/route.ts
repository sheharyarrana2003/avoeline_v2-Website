import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import { fileStore } from "@/src/features/files/fileStore";
import { validateAndNormalizeProof } from "@/src/features/files/validateUpload";
import { assertPublicRegistrationEvent } from "@/src/features/registration/publicRegistrationEligibility";
import {
  mapProofUploadClientError,
  UPLOAD_FILE_HELP,
} from "@/src/features/registration/registrationErrors";

export const runtime = "nodejs";
export const maxDuration = 60;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}

/**
 * Public payment/proof upload → FileStore (Drive first, fallback).
 * Returns `{ fileId }` only — no Drive URLs or tokens.
 * Attendee-facing errors are plain language (never raw Drive/Zod).
 */
export async function POST(req: NextRequest) {
  let eventId = "";
  let fileName = "proof";
  let declaredMime = "";
  let bytes: Buffer | null = null;

  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      eventId = String(form.get("eventId") || "").trim();
      const file = form.get("file");
      if (file instanceof File) {
        fileName = file.name || "proof";
        declaredMime = file.type || "";
        bytes = Buffer.from(await file.arrayBuffer());
      }
    } else {
      const body = (await req.json()) as {
        eventId?: string;
        fileName?: string;
        contentType?: string;
        contentBase64?: string;
      };
      eventId = String(body.eventId || "").trim();
      fileName = String(body.fileName || "proof").slice(0, 200);
      declaredMime = String(body.contentType || "");
      if (body.contentBase64) {
        bytes = Buffer.from(body.contentBase64, "base64");
      }
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: UPLOAD_FILE_HELP, code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  if (!bytes) {
    return NextResponse.json(
      { ok: false, error: UPLOAD_FILE_HELP, code: "MISSING_FILE" },
      { status: 400 },
    );
  }

  const gate = await assertPublicRegistrationEvent(eventId);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.message, code: gate.code },
      { status: gate.status },
    );
  }

  const ip = clientIp(req);
  const limited = rateLimit(`uploads-proof:${eventId}:${ip}`, 15, 60);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: mapProofUploadClientError("Too many uploads.", 429),
        code: "RATE_LIMIT",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const normalized = await validateAndNormalizeProof({
    bytes,
    fileName,
    declaredMime,
  });
  if (!normalized.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: mapProofUploadClientError(normalized.error),
        code: normalized.code,
      },
      { status: 400 },
    );
  }

  try {
    const put = await fileStore.put({
      name: normalized.name,
      mime: normalized.mime,
      bytes: normalized.bytes,
      checksum: normalized.checksum,
      category: "payment_proof",
      entityType: "event",
      entityId: eventId,
      organizerId: gate.event.organizerId,
      eventId,
      folderKind: "payment_proofs",
      allowFallback: true,
      linkLibrary: false,
    });

    return NextResponse.json({ ok: true, fileId: put.fileId });
  } catch (err) {
    logger.error("[uploads/proof]", { err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json(
      { ok: false, error: UPLOAD_FILE_HELP, code: "UPLOAD_FAILED" },
      { status: 502 },
    );
  }
}
