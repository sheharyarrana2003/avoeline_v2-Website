"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminAuth } from "@/data/admin_db";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { sendEmail, escapeHtml } from "@/src/lib/email";
import { finishForm } from "@/src/lib/formRedirect";

function tempPassword(): string {
  return `Av-${randomBytes(6).toString("base64url")}`;
}

function backToNew(error: string): never {
  redirect(`/admin/tenants/new?e=${encodeURIComponent(error)}`);
}

/**
 * Admin-provisioned tenant. Departments get an org plus a department_admin
 * membership, which is what routes that login to /department.
 */
export async function createTenantAccount(formData: FormData): Promise<void> {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) backToNew("Please sign in as an admin.");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const tenantType = String(formData.get("tenantType") ?? "").trim();
  const planKey = String(formData.get("planKey") ?? "free").trim() || "free";
  const chosenPassword = String(formData.get("password") ?? "");
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) backToNew("Name and a valid email are required.");
  if (!["organizer", "department", "vendor"].includes(tenantType)) backToNew("Choose organizer, department, or vendor.");
  if (chosenPassword && chosenPassword.length < 8) backToNew("A chosen temporary password needs at least 8 characters.");
  if (!chosenPassword && !(process.env.BREVO_API_KEY && process.env.MAIL_FROM)) {
    backToNew("Email sending isn't configured, so type a temporary password to share with them yourself.");
  }

  if (tenantType !== "vendor") {
    const { data: plan } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("key, is_active")
      .eq("key", planKey)
      .maybeSingle();
    if (!plan || plan.is_active === false) backToNew("Pick an active plan.");
  }

  const password = chosenPassword || tempPassword();
  let uid: string;
  try {
    const created = await adminAuth.createUser({ email, password, displayName: name });
    uid = created.uid;
  } catch (err) {
    console.error("[createTenantAccount]", err);
    backToNew("Could not create that account. The email may already be in use.");
  }

  const now = new Date().toISOString();
  const userType = tenantType === "department" ? "organizer" : tenantType;
  await supabaseAdmin.from(TABLES.USERS).upsert({
    id: uid,
    email,
    full_name: name,
    user_type: userType,
    account_status: "active",
    must_reset_password: true,
    setup_complete: tenantType === "department",
    created_at: now,
    updated_at: now,
  });

  let departmentId: string | null = null;
  if (tenantType === "department") {
    const { data: org, error } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .insert({ name, org_type: "department", owner_user_id: uid, is_verified: true, contact_email: email })
      .select("id")
      .single();
    if (error || !org) {
      console.error("[createTenantAccount] department org", error);
      backToNew("The login was created, but the department record failed. Create it from Orgs & Clubs.");
    }
    departmentId = String(org.id);
    await supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .upsert({ org_id: departmentId, user_id: uid, role: "department_admin" }, { onConflict: "org_id,user_id" });
  }

  if (tenantType === "organizer" || tenantType === "department") {
    await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
      user_id: uid,
      org_name: name,
      org_id: departmentId,
      plan_type: planKey,
      review_status: "approved",
    });
  }
  if (tenantType === "vendor") {
    await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
      user_id: uid,
      business_name: name,
      business_email: email,
      status: "approved",
    });
  }

  const emailed = await sendEmail(
    { email, name },
    {
      subject: "Your Avoeline account",
      html: `<p>Hello ${escapeHtml(name)},</p><p>An administrator created an Avoeline account for you.</p><p>Temporary password: <strong>${escapeHtml(password)}</strong></p><p>Sign in and you will be asked to set a new password before continuing.</p>`,
      text: `Hello ${name}. Temporary password: ${password}. Sign in and reset it.`,
    },
  );

  revalidatePath("/admin/tenants");
  revalidatePath("/admin/orgs");
  const params = new URLSearchParams({ created: email, emailed: emailed ? "1" : "0" });
  redirect(`/admin/tenants?${params.toString()}`);
}

export async function setTenantVerification(formData: FormData): Promise<void> {
  finishForm(formData, "/admin/tenants", await setTenantVerificationImpl(formData), "Tenant updated.");
}

async function setTenantVerificationImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return fail("Please sign in as an admin.");

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id) return fail("Missing record.");

  if (kind === "org") {
    const verified = action === "approve";
    await supabaseAdmin.from(TABLES.ORGANIZATIONS).update({ is_verified: verified }).eq("id", id);
  } else if (kind === "vendor") {
    const status = action === "approve" ? "approved" : action === "suspend" ? "suspended" : "rejected";
    await supabaseAdmin.from(TABLES.VENDOR_PROFILES).update({ status }).eq("user_id", id);
  } else if (kind === "organizer") {
    const review_status = action === "approve" ? "approved" : action === "flag" ? "flagged" : "rejected";
    await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).update({ review_status }).eq("user_id", id);
  } else {
    return fail("Unknown tenant kind.");
  }

  revalidatePath("/admin/tenants");
  return ok();
}
