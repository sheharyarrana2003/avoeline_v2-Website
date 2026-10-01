import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export async function listPendingTenants() {
  const [orgs, vendors, organizers] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("id, name, org_type, is_verified, contact_email, created_at")
      .eq("is_verified", false)
      .in("org_type", ["department", "club"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("user_id, business_name, business_email, status")
      .eq("status", "pending")
      .limit(50),
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("user_id, org_name, review_status, plan_type")
      .in("review_status", ["pending", "flagged"])
      .limit(50),
  ]);

  return {
    orgs: orgs.data ?? [],
    vendors: vendors.data ?? [],
    organizers: organizers.data ?? [],
  };
}

export async function listOrganizerPlanRows() {
  const { data } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("user_id, org_name, plan_type, review_status")
    .limit(80);
  return data ?? [];
}

export type PlanRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_monthly: number | string | null;
  price_yearly: number | string | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
  included_modules: string[] | null;
};

export async function listPlans(opts: { activeOnly?: boolean } = {}): Promise<PlanRow[]> {
  let q = supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("*")
    .order("sort_order")
    .order("price_monthly");
  if (opts.activeOnly) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as PlanRow[];
}

export async function listFeatureOverrides() {
  const { data } = await supabaseAdmin
    .from(TABLES.FEATURE_OVERRIDES)
    .select("id, organizer_id, target_org_id, module_key, denied, reason, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  return data ?? [];
}

export async function getPlanCounts(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).select("plan_type");
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = String(row.plan_type || "free");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
