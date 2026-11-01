"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { AuthService } from "@/src/features/auth/authService";
import { getAuthenticatedUser } from "@/src/features/auth/rbac.service";
import { can } from "@/src/features/permissions/can";
import { logModeration } from "./moderation";

export async function updateDepartment(formData: FormData): Promise<void> {
  const orgId = String(formData.get("orgId") ?? "").trim();
  finishForm(
    formData,
    `/admin/departments/${orgId}`,
    await updateDepartmentImpl(formData),
    "Department saved.",
  );
}

async function updateDepartmentImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("orgs");
  if (!admin) return fail("Please sign in as an admin.");

  const user = await getAuthenticatedUser();
  if (!(await can(user, "admin:orgs:manage"))) {
    return fail("You do not have permission to edit departments.");
  }

  const orgId = String(formData.get("orgId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!orgId || !name) return fail("Name is required.");

  const { data: org } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id, org_type")
    .eq("id", orgId)
    .maybeSingle();
  if (!org || org.org_type !== "department") {
    return fail("That department does not exist.");
  }

  // Platform edits name only; contact/logo/description stay with the department tenant.
  const { error } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (error) return fail("Could not save those changes.");

  revalidatePath("/admin/orgs");
  revalidatePath(`/admin/departments/${orgId}`);
  return ok();
}

/** useActionState-compatible: verify / unverify with reason when unverify. */
export async function setDepartmentVerifiedAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("orgs");
  if (!admin) return fail("Please sign in as an admin.");
  const user = await getAuthenticatedUser();
  if (!(await can(user, "admin:orgs:manage"))) {
    return fail("You do not have permission to change department status.");
  }

  const orgId = String(formData.get("orgId") ?? "").trim();
  const verified = String(formData.get("verified") ?? "") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orgId) return fail("Missing department.");
  if (!verified && reason.length < 3) return fail("A reason is required.");

  const { data: org } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id, org_type, name, is_verified")
    .eq("id", orgId)
    .maybeSingle();
  if (!org || org.org_type !== "department") return fail("That department does not exist.");

  const { error } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .update({ is_verified: verified, updated_at: new Date().toISOString() })
    .eq("id", orgId);
  if (error) return fail("Could not update status.");

  await logModeration({
    admin,
    targetType: "organizer",
    targetId: orgId,
    targetLabel: String(org.name || "Department"),
    action: verified ? "approved" : "suspended",
    reason: reason || (verified ? "Verified department" : "Unverified department"),
  });

  revalidatePath(`/admin/departments/${orgId}`);
  revalidatePath("/admin/orgs");
  return ok();
}
