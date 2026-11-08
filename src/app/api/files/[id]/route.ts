import { NextRequest, NextResponse } from "next/server";
import { fileStore } from "@/src/features/files/fileStore";
import {
  authorizeStoredFileAccess,
  contentDisposition,
  shouldInline,
} from "@/src/features/files/authorizeFileAccess";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Permissioned file proxy. Never returns Drive URLs or tokens.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid file id." }, { status: 400 });
  }

  const row = await fileStore.get(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const access = await authorizeStoredFileAccess(row);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  try {
    const streamed = await fileStore.stream(id);
    const body =
      Buffer.isBuffer(streamed.body) || streamed.body instanceof Uint8Array
        ? Buffer.from(streamed.body)
        : streamed.body;

    const inline = shouldInline(streamed.mime);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": streamed.mime || "application/octet-stream",
        "Content-Disposition": contentDisposition(inline, streamed.name),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=60",
        ...(typeof streamed.size === "number" ? { "Content-Length": String(streamed.size) } : {}),
      },
    });
  } catch (err) {
    logger.error("[api/files]", { id, err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Could not load file." }, { status: 502 });
  }
}
