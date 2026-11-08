import { NextRequest, NextResponse } from "next/server";
import { promoteFallbackFiles } from "@/src/features/files/promote";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get("secret") || req.nextUrl.searchParams.get("cron_secret");
  return q === secret;
}

/** Promote FileStore fallback objects to organizer Drive. */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await promoteFallbackFiles(40);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error("[cron/file-promote]", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
