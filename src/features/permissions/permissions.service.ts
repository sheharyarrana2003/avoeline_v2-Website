import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { isModuleKey, type ModuleKey } from "./moduleKeys";

function overrideLive(row: { expires_at?: string | null } | null | undefined, nowIso: string): boolean {
  if (!row) return false;
  return !row.expires_at || String(row.expires_at) > nowIso;
}

/** Clubs this user presidents or owns — not only organizer_profiles.org_id. */
export const clubsLedByUser = cache(async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const [{ data: memberships }, { data: owned }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .select("org_id")
      .eq("user_id", userId)
      .eq("role", "president"),
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("id")
      .eq("org_type", "club")
      .eq("owner_user_id", userId),
  ]);
  return [...new Set([
    ...(memberships ?? []).map((m) => String(m.org_id)),
    ...(owned ?? []).map((o) => String(o.id)),
  ])];
});

/**
 * Plan + override gate (docs/04). Every tab/action must call this.
 * Service-role read so organizers still resolve access when RLS is tight.
 * A deny override wins. Then a grant. Club grants from a department beat a
 * weaker personal plan (president may still be on Free as an organizer).
 */
export const hasModuleAccess = cache(async (organizerId: string, moduleKey: ModuleKey): Promise<boolean> => {
  if (!organizerId || !moduleKey) return false;

  const nowIso = new Date().toISOString();
  const [{ data: profile }, { data: overrides }, { data: orgOverrides }] = await Promise.all([
    supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).select("plan_type, org_id").eq("user_id", organizerId).maybeSingle(),
    supabaseAdmin
      .from(TABLES.FEATURE_OVERRIDES)
      .select("id, expires_at, denied")
      .eq("organizer_id", organizerId)
      .eq("module_key", moduleKey),
    supabaseAdmin
      .from(TABLES.FEATURE_OVERRIDES)
      .select("id, expires_at, denied, target_org_id")
      .eq("module_key", moduleKey)
      .not("target_org_id", "is", null)
      .limit(40),
  ]);

  const live = (overrides ?? []).filter((row) => overrideLive(row, nowIso));
  if (live.some((row) => row.denied)) return false;
  if (live.some((row) => !row.denied)) return true;

  const orgId = profile?.org_id as string | undefined;
  const orgLive = (orgOverrides ?? []).filter(
    (row) => row.target_org_id === orgId && overrideLive(row, nowIso),
  );
  if (orgLive.some((row) => row.denied)) return false;
  if (orgLive.some((row) => !row.denied)) return true;

  const ledClubs = await clubsLedByUser(organizerId);
  const clubIds = [...new Set([orgId, ...ledClubs].filter(Boolean))] as string[];
  if (clubIds.length) {
    const { data: clubRows } = await supabaseAdmin
      .from(TABLES.ORG_MODULE_ACCESS)
      .select("org_id, enabled")
      .in("org_id", clubIds)
      .eq("module_key", moduleKey);
    if ((clubRows ?? []).some((row) => row.enabled !== false)) return true;
  }

  const planKey = String(profile?.plan_type || "free");
  const { data: plan } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("included_modules, is_active")
    .eq("key", planKey)
    .maybeSingle();

  if (plan && plan.is_active === false) return false;

  const included = (plan?.included_modules as string[] | null) ?? [];
  return included.includes(moduleKey);
});

/**
 * Cross-cutting permission check (docs/00-INDEX). Module keys reuse hasModuleAccess
 * when the actor is an organizer. Other keys (e.g. registrations:manage) look at
 * team_positions.permissions for memberships of this user.
 */
export async function checkPermission(userId: string, permissionKey: string): Promise<boolean> {
  if (!userId || !permissionKey) return false;

  const { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, user_type, is_owner")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return false;
  if (user.is_owner || user.user_type === "platform_admin") return true;

  if (isModuleKey(permissionKey) && user.user_type === "organizer") {
    return hasModuleAccess(userId, permissionKey);
  }

  const { data: memberships } = await supabaseAdmin
    .from(TABLES.TEAM_MEMBERS)
    .select("position_id")
    .eq("user_id", userId);
  const positionIds = (memberships ?? []).map((m) => m.position_id).filter(Boolean) as string[];
  if (!positionIds.length) return false;

  const { data: positions } = await supabaseAdmin
    .from(TABLES.TEAM_POSITIONS)
    .select("permissions")
    .in("id", positionIds);

  return (positions ?? []).some((p) => ((p.permissions as string[]) ?? []).includes(permissionKey));
}

export async function clubHasModule(orgId: string, moduleKey: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from(TABLES.ORG_MODULE_ACCESS)
    .select("enabled")
    .eq("org_id", orgId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  if (!data) return false;
  return data.enabled !== false;
}
