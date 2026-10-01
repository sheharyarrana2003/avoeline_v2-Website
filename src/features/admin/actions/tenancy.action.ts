"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { AuthService } from "@/src/features/auth/authService";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { purgeOrgWithAuth, purgeUserWithAuth } from "../purgeAccount";
import { getOrganizerRow, listVendors } from "../admin.service";

function revalidateTenancy() {
  revalidatePath("/admin/orgs");
  revalidatePath("/admin/organizers");
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
}

export async function updateOrg(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/orgs", await updateOrgImpl(formData), "Saved.");
}

async function updateOrgImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("orgs");
  if (!admin) return fail("Please sign in as an admin.");

  const orgId = String(formData.get("orgId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const parentOrgId = String(formData.get("parentOrgId") ?? "").trim();
  const planKey = String(formData.get("planKey") ?? "").trim();
  if (!orgId || !name) return fail("Name is required.");

  const org = await TeamEngineService.getOrg(orgId);
  if (!org) return fail("That department or club does not exist.");

  const patch: Record<string, unknown> = { name, updated_at: new Date().toISOString() };
  if (org.type === "club") {
    if (!parentOrgId) return fail("A club needs a parent department.");
    patch.parent_org_id = parentOrgId;
  }

  const { error } = await supabaseAdmin.from(TABLES.ORGANIZATIONS).update(patch).eq("id", orgId);
  if (error) return fail("Could not save those changes.");

  if (planKey && org.ownerUid) {
    const { data: plan } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("key, is_active")
      .eq("key", planKey)
      .maybeSingle();
    if (!plan || plan.is_active === false) return fail("Pick an active plan.");
    await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
      user_id: org.ownerUid,
      org_name: name,
      org_id: org.type === "department" ? orgId : org.parentOrgId,
      plan_type: planKey,
    });
  }

  revalidateTenancy();
  revalidatePath(`/admin/orgs/${orgId}`);
  return ok();
}

export async function deleteOrg(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/orgs", await deleteOrgImpl(formData), "Deleted, including related logins.");
}

async function deleteOrgImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("orgs");
  if (!admin) return fail("Please sign in as an admin.");
  if (!admin.isOwner) return fail("Only a platform owner can delete a department or club.");

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) return fail("Missing organization.");
  const org = await TeamEngineService.getOrg(orgId);
  if (!org) return fail("That department or club does not exist.");

  try {
    await purgeOrgWithAuth(orgId);
  } catch (err) {
    console.error("[deleteOrg]", err);
    return fail("Could not delete that organization. Related records may still be in use.");
  }

  revalidateTenancy();
  return ok();
}

export async function updateOrganizerAccount(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/organizers", await updateOrganizerAccountImpl(formData), "Organizer updated.");
}

async function updateOrganizerAccountImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("organizers");
  if (!admin) return fail("You do not have permission to manage organizers.");

  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const planKey = String(formData.get("planKey") ?? "").trim();
  if (!organizerId || !name) return fail("Name is required.");

  const row = await getOrganizerRow(organizerId);
  if (!row) return fail("That organizer does not exist.");

  if (planKey) {
    const { data: plan } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("key, is_active")
      .eq("key", planKey)
      .maybeSingle();
    if (!plan || plan.is_active === false) return fail("Pick an active plan.");
  }

  await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
    user_id: row.userId,
    org_name: name,
    ...(planKey ? { plan_type: planKey } : {}),
  });
  await supabaseAdmin
    .from(TABLES.USERS)
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq("id", row.userId);

  revalidatePath("/admin/organizers");
  revalidatePath(`/admin/organizers/${row.organizerId}`);
  revalidatePath("/admin/tenants");
  return ok();
}

export async function deleteOrganizerAccount(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/organizers", await deleteOrganizerAccountImpl(formData), "Organizer and Auth login deleted.");
}

async function deleteOrganizerAccountImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("organizers");
  if (!admin) return fail("You do not have permission to manage organizers.");
  if (!admin.isOwner) return fail("Only a platform owner can delete an organizer.");

  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const row = organizerId ? await getOrganizerRow(organizerId) : null;
  if (!row) return fail("That organizer does not exist.");
  if (row.userId === admin.userId) return fail("You cannot delete your own account.");

  try {
    await purgeUserWithAuth(row.userId);
  } catch (err) {
    console.error("[deleteOrganizerAccount]", err);
    return fail("Could not delete that organizer from the database and Auth.");
  }

  revalidateTenancy();
  return ok();
}

export async function updateVendorAccount(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/vendors", await updateVendorAccountImpl(formData), "Vendor updated.");
}

async function updateVendorAccountImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("vendors");
  if (!admin) return fail("You do not have permission to manage vendors.");

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!vendorId || !name) return fail("Name is required.");

  const vendors = await listVendors();
  const row = vendors.find((v) => v.vendorId === vendorId);
  if (!row) return fail("That vendor does not exist.");

  await supabaseAdmin
    .from(TABLES.VENDOR_PROFILES)
    .update({ business_name: name })
    .eq("user_id", vendorId);
  await supabaseAdmin
    .from(TABLES.USERS)
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq("id", vendorId);

  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  return ok();
}

export async function deleteVendorAccount(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/vendors", await deleteVendorAccountImpl(formData), "Vendor and Auth login deleted.");
}

async function deleteVendorAccountImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("vendors");
  if (!admin) return fail("You do not have permission to manage vendors.");
  if (!admin.isOwner) return fail("Only a platform owner can delete a vendor.");

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const vendors = await listVendors();
  const row = vendors.find((v) => v.vendorId === vendorId);
  if (!row) return fail("That vendor does not exist.");
  if (vendorId === admin.userId) return fail("You cannot delete your own account.");

  try {
    await purgeUserWithAuth(vendorId);
  } catch (err) {
    console.error("[deleteVendorAccount]", err);
    return fail("Could not delete that vendor from the database and Auth.");
  }

  revalidateTenancy();
  return ok();
}
