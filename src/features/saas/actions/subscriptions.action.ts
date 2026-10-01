"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { isModuleKey } from "@/src/features/permissions/moduleKeys";
import { finishForm } from "@/src/lib/formRedirect";

export async function changeOrganizerPlan(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/tenants", await changeOrganizerPlanImpl(formData), "Plan changed.");
}

export async function grantFeatureOverride(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/tenants", await grantFeatureOverrideImpl(formData), "Feature override saved.");
}

export async function clearFeatureOverride(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/tenants", await clearFeatureOverrideImpl(formData), "Override removed.");
}

export async function saveCustomPricing(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/tenants", await saveCustomPricingImpl(formData), "Pricing agreement saved.");
}

async function changeOrganizerPlanImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return fail("Please sign in as an admin.");

  const organizerId = String(formData.get("organizerId") ?? "");
  const toPlan = String(formData.get("toPlan") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!organizerId || !toPlan) return fail("Pick an organizer and a plan.");
  const { data: plan } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("key, is_active")
    .eq("key", toPlan)
    .maybeSingle();
  if (!plan || plan.is_active === false) return fail("That plan doesn't exist or is inactive.");

  const { data: profile } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("plan_type")
    .eq("user_id", organizerId)
    .maybeSingle();

  await supabaseAdmin.from(TABLES.PLAN_CHANGES).insert({
    organizer_id: organizerId,
    from_plan: profile?.plan_type ?? "free",
    to_plan: toPlan,
    changed_by: admin.userId,
    reason: reason || null,
  });
  await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
    user_id: organizerId,
    plan_type: toPlan,
  });

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/organizers/${organizerId}`);
  return ok();
}

async function grantFeatureOverrideImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return fail("Please sign in as an admin.");

  const organizerId = String(formData.get("organizerId") ?? "").trim() || null;
  const targetOrgId = String(formData.get("targetOrgId") ?? "").trim() || null;
  const moduleKey = String(formData.get("moduleKey") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const expiresAt = String(formData.get("expiresAt") ?? "").trim() || null;
  const effect = String(formData.get("effect") ?? "grant");
  if (!isModuleKey(moduleKey)) return fail("Choose a valid module.");
  if (!organizerId && !targetOrgId) return fail("Choose an organizer or an organization.");
  if (effect !== "grant" && effect !== "deny") return fail("Choose grant or deny.");

  let q = supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).delete().eq("module_key", moduleKey);
  q = organizerId ? q.eq("organizer_id", organizerId) : q.is("organizer_id", null);
  q = targetOrgId ? q.eq("target_org_id", targetOrgId) : q.is("target_org_id", null);
  await q;

  await supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).insert({
    organizer_id: organizerId,
    target_org_id: targetOrgId,
    module_key: moduleKey,
    granted_by: admin.userId,
    reason: reason || null,
    expires_at: expiresAt,
    denied: effect === "deny",
  });

  revalidatePath("/admin/tenants");
  return ok();
}

async function clearFeatureOverrideImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return fail("Please sign in as an admin.");
  const id = String(formData.get("overrideId") ?? "").trim();
  if (!id) return fail("Missing override.");
  await supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).delete().eq("id", id);
  revalidatePath("/admin/tenants");
  return ok();
}

async function saveCustomPricingImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return fail("Please sign in as an admin.");

  const organizerId = String(formData.get("organizerId") ?? "");
  if (!organizerId) return fail("Missing organizer.");
  const discount = Number(formData.get("discountPct"));
  const flat = Number(formData.get("flatMonthly"));
  const notes = String(formData.get("notes") ?? "").trim();

  await supabaseAdmin.from(TABLES.CUSTOM_PRICING_AGREEMENTS).insert({
    organizer_id: organizerId,
    discount_pct: Number.isFinite(discount) ? discount : null,
    flat_monthly_override: Number.isFinite(flat) ? flat : null,
    notes: notes || null,
    set_by: admin.userId,
    active: true,
  });
  revalidatePath("/admin/tenants");
  return ok();
}
