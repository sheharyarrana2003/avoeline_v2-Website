import { NextRequest, NextResponse } from "next/server";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import { fileStore } from "@/src/features/files/fileStore";
import { validateAndNormalizeProof } from "@/src/features/files/validateUpload";

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
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !bytes) {
    return NextResponse.json(
      { ok: false, error: "eventId and file are required." },
      { status: 400 },
    );
  }

  const ip = clientIp(req);
  const limited = rateLimit(`uploads-proof:${eventId}:${ip}`, 15, 60);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many uploads. Try again shortly.",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const { data: event, error: eventErr } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("id, organizer_id, status, requires_registration, schedule")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }
  if (event.requires_registration === false) {
    return NextResponse.json(
      { ok: false, error: "This event does not take registrations." },
      { status: 400 },
    );
  }

  const schedule = (event.schedule || {}) as { startDate?: string; endDate?: string };
  if (!isActiveLifecycle(eventLifecycle(String(event.status || ""), schedule))) {
    return NextResponse.json(
      { ok: false, error: "This event is not open for registration." },
      { status: 400 },
    );
  }

  const normalized = await validateAndNormalizeProof({
    bytes,
    fileName,
    declaredMime,
  });
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, error: normalized.error, code: normalized.code },
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
      organizerId: String(event.organizer_id),
      eventId,
      folderKind: "payment_proofs",
      allowFallback: true,
      linkLibrary: false,
    });

    return NextResponse.json({ ok: true, fileId: put.fileId });
  } catch (err) {
    logger.error("[uploads/proof]", { err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Upload failed." },
      { status: 502 },
    );
  }
}
