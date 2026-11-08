import { NextRequest, NextResponse } from "next/server";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { buildQrPayload, generateQrPng } from "@/src/features/registration/qr";
import type { QrPayload } from "@/src/features/registration/types";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";

function parseToken(raw: string): string | null {
  const t = decodeURIComponent(raw || "")
    .replace(/\.png$/i, "")
    .trim();
  return /^[0-9a-f-]{36}$/i.test(t) ? t : null;
}

function payloadFromStored(
  data: unknown,
  registrationId: string,
  eventId: string,
): QrPayload | null {
  if (typeof data === "string" && data.trim()) {
    try {
      const parsed = JSON.parse(data) as QrPayload;
      if (parsed?.registrationId && parsed?.eventId) return parsed;
    } catch {
      // fall through — rebuild
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (o.registrationId && o.eventId) {
      return {
        name: String(o.name || ""),
        email: String(o.email || ""),
        eventId: String(o.eventId),
        registrationId: String(o.registrationId),
        timestamp: String(o.timestamp || ""),
      };
    }
  }
  return null;
}

/**
 * On-demand QR PNG. Token is the registration UUID (unguessable).
 * Never stores QR images in Drive / Storage.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const registrationId = parseToken(raw);
  if (!registrationId) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id, event_id, attendee_name, attendee_email, qr_code_data, created_at")
    .eq("id", registrationId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  let payload =
    payloadFromStored(data.qr_code_data, data.id, data.event_id) ||
    buildQrPayload({
      name: String(data.attendee_name || ""),
      email: String(data.attendee_email || ""),
      eventId: String(data.event_id),
      registrationId: String(data.id),
      timestamp: String(data.created_at || new Date().toISOString()),
    });

  try {
    const png = await generateQrPng(payload);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${registrationId}.png"`,
      },
    });
  } catch (err) {
    logger.error("[api/qr]", { err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Could not render QR." }, { status: 500 });
  }
}
