import { NextRequest, NextResponse } from "next/server";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { mailAccessEnded } from "@/src/features/email/tenantMail.service";
import { MODULE_LABELS, type ModuleKey } from "@/src/features/permissions/moduleKeys";
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
 * Hourly: find expired feature_overrides not yet emailed, group by tenant, send one access-ended email.
 * Read-time access already ignores expired rows; this only notifies.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from(TABLES.FEATURE_OVERRIDES)
    .select("id, organizer_id, target_org_id, module_key, expires_at, ended_emailed_at")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso)
    .is("ended_emailed_at", null)
    .limit(200);

  if (error) {
    logger.error("[cron/feature-override-expiry] query failed", { err: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const byUser = new Map<string, { ids: string[]; features: string[] }>();
  for (const row of rows ?? []) {
    const userId = row.organizer_id ? String(row.organizer_id) : "";
    if (!userId) continue;
    const key = row.module_key as ModuleKey;
    const label = MODULE_LABELS[key] || String(row.module_key);
    const bucket = byUser.get(userId) ?? { ids: [], features: [] };
    bucket.ids.push(String(row.id));
    bucket.features.push(label);
    byUser.set(userId, bucket);
  }

  let emailed = 0;
  for (const [userId, bucket] of byUser) {
    const { data: user } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!user?.email) continue;
    try {
      await mailAccessEnded({
        to: user.email,
        userId,
        tenantName: user.full_name || user.email,
        features: bucket.features,
      });
      await supabaseAdmin
        .from(TABLES.FEATURE_OVERRIDES)
        .update({ ended_emailed_at: nowIso })
        .in("id", bucket.ids);
      emailed += 1;
    } catch (err) {
      logger.warn("[cron/feature-override-expiry] mail failed", {
        userId,
        err: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ ok: true, expiredRows: rows?.length ?? 0, tenantsEmailed: emailed });
}
