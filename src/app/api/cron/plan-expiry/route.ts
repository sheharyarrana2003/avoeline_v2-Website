import { NextRequest, NextResponse } from "next/server";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import {
  createPlatformAlert,
  hasRecentPlatformAlert,
} from "@/src/features/admin/platformAlerts.service";
import { sendPlanExpiryReminderEmail } from "@/src/features/email/platformMail.service";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get("secret") || req.nextUrl.searchParams.get("cron_secret");
  return q === secret;
}

/**
 * Reminds organizers whose plan_expires_at is within the next 5 days.
 * Protect with CRON_SECRET (Authorization: Bearer … or ?secret=).
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("user_id, plan_type, plan_expires_at")
    .not("plan_expires_at", "is", null)
    .gt("plan_expires_at", now.toISOString())
    .lte("plan_expires_at", inFiveDays.toISOString());

  if (error) {
    logger.error("[cron/plan-expiry] query failed", { err: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let emailed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const row of rows ?? []) {
    const userId = row.user_id;
    const expiresAt = row.plan_expires_at;
    if (!userId || !expiresAt) {
      skipped += 1;
      continue;
    }

    const recent = await hasRecentPlatformAlert({
      kind: "plan_expiry_reminder",
      targetUserId: userId,
      withinDays: 6,
    });
    if (recent) {
      skipped += 1;
      continue;
    }

    const planName = row.plan_type || "current";
    const mail = await sendPlanExpiryReminderEmail({
      organizerId: userId,
      planName,
      expiresAt,
    }).catch((err) => {
      logger.warn("[cron/plan-expiry] email failed", {
        userId,
        err: err instanceof Error ? err.message : "unknown",
      });
      return { ok: false as const, error: "send failed" };
    });

    await createPlatformAlert({
      kind: "plan_expiry_reminder",
      title: `Plan expiry: ${planName}`,
      body: `Organizer plan expires ${expiresAt}.`,
      href: "/admin/tenants",
      targetUserId: userId,
    });

    if (mail.ok) emailed += 1;
    else failures.push(userId);
  }

  return NextResponse.json({
    ok: true,
    candidates: rows?.length ?? 0,
    emailed,
    skipped,
    failures,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
