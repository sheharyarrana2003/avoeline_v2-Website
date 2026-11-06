import { NextRequest, NextResponse } from "next/server";
import { runConnectionsHealthJob } from "@/src/features/connections/server/health.service";
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

/** Daily Connections health snapshot (needs_reconnect counts, paused syncs). */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runConnectionsHealthJob();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logger.error("[cron/connections-health]", {
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
