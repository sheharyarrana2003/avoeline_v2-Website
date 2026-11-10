import { NextRequest, NextResponse } from "next/server";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { generateQrPng } from "@/src/features/registration/qr";
import { verifyCheckInToken } from "@/src/features/registration/checkInToken";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";

/**
 * On-demand QR PNG. Path token is the signed opaque check-in token (N4).
 * Never stores QR images; never encodes PII in the QR payload.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const decoded = decodeURIComponent(raw || "")
    .replace(/\.png$/i, "")
    .trim();
  const verified = verifyCheckInToken(decoded);
  if (!verified) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id, event_id")
    .eq("id", verified.rid)
    .eq("event_id", verified.eid)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const png = await generateQrPng(decoded);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="ticket-qr.png"`,
      },
    });
  } catch (err) {
    logger.error("[api/qr] generate failed", { err });
    return NextResponse.json({ ok: false, error: "Failed to render QR." }, { status: 500 });
  }
}
