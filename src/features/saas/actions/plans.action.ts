"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { isModuleKey } from "@/src/features/permissions/moduleKeys";
import { finishForm } from "@/src/lib/formRedirect";

function toNumberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function revalidatePlans() {
  revalidatePath("/admin/plans");
  revalidatePath("/admin/tenants");
}

export async function savePlan(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/plans", await savePlanImpl(formData), "Plan saved.");
}

export async function togglePlanActive(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/plans", await togglePlanActiveImpl(formData), "Plan updated.");
}

export async function deletePlan(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/plans", await deletePlanImpl(formData), "Plan deleted.");
}

async function savePlanImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("plans");
  if (!admin) return fail("Please sign in as an admin.");

  const id = String(formData.get("id") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(key)) return fail("Key must be 2–32 lowercase letters, numbers, - or _.");
  if (!name) return fail("Plan name is required.");

  const modules = formData.getAll("modules").map(String).filter(isModuleKey);

  const row = {
    key,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    price_monthly: toNumberOrNull(formData.get("priceMonthly")) ?? 0,
    price_yearly: toNumberOrNull(formData.get("priceYearly")),
    currency: String(formData.get("currency") ?? "PKR").trim().toUpperCase() || "PKR",
    sort_order: Math.trunc(toNumberOrNull(formData.get("sortOrder")) ?? 0),
    is_active: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    included_modules: modules,
    updated_at: new Date().toISOString(),
  };

  if (key === "free") row.is_active = true;

  const { error } = id
    ? await supabaseAdmin.from(TABLES.SUBSCRIPTION_PLANS).update(row).eq("id", id)
    : await supabaseAdmin.from(TABLES.SUBSCRIPTION_PLANS).insert(row);
  if (error) {
    if (error.code === "23505") return fail("Another plan already uses that key.");
    console.error("[savePlan]", error);
    return fail("Could not save the plan.");
  }

  revalidatePlans();
  return ok();
}

async function togglePlanActiveImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("plans");
  if (!admin) return fail("Please sign in as an admin.");

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  const { data: plan } = await supabaseAdmin.from(TABLES.SUBSCRIPTION_PLANS).select("key").eq("id", id).maybeSingle();
  if (!plan) return fail("Plan not found.");
  if (plan.key === "free" && !active) return fail("The free plan must stay active.");

  await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePlans();
  return ok();
}

async function deletePlanImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("plans");
  if (!admin) return fail("Please sign in as an admin.");

  const id = String(formData.get("id") ?? "");
  const { data: plan } = await supabaseAdmin.from(TABLES.SUBSCRIPTION_PLANS).select("key").eq("id", id).maybeSingle();
  if (!plan) return fail("Plan not found.");
  if (plan.key === "free") return fail("The free plan can't be deleted.");

  const { error } = await supabaseAdmin.from(TABLES.SUBSCRIPTION_PLANS).delete().eq("id", id);
  if (error) return fail("Organizers are still on this plan. Move them first or deactivate it instead.");
  revalidatePlans();
  return ok();
}
