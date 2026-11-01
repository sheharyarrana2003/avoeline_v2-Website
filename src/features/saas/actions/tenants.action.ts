"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { canTenantCap } from "@/src/features/admin/types";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { mailAccountReady, mailApprovalDecision } from "@/src/features/email/tenantMail.service";
import { absoluteUrl } from "@/src/lib/appUrl";
import { logger } from "@/src/lib/logger";

async function requireTenantAdmin(cap: Parameters<typeof canTenantCap>[1]) {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return safeFail("UNAUTHORIZED", "Please sign in as an admin.");
  if (!canTenantCap(admin, cap)) {
    return safeFail("FORBIDDEN", "You do not have permission for this action.");
  }
  return admin;
}

function tempPassword(): string {
  return `Av-${randomBytes(6).toString("base64url")}`;
}

async function createAuthUser(input: { email: string; password: string; displayName?: string }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.displayName },
  });
  if (error || !data.user) {
    const msg = error?.message || "createUser failed";
    const err = new Error(msg) as Error & { code?: string };
    err.code = /already|exists/i.test(msg) ? "auth/email-already-exists" : "auth/invalid-password";
    throw err;
  }
  return { uid: data.user.id };
}

async function deleteAuthUser(uid: string) {
  await supabaseAdmin.auth.admin.deleteUser(uid).catch((err) =>
    logger.warn("[createTenant] rollback auth failed", {
      err: err instanceof Error ? err.message : "unknown",
    }),
  );
}

const createSchema = z.object({
  tenantType: z.enum(["department", "organizer", "vendor"]),
  name: z.string().trim().min(1).max(160),
  email: z
    .string()
    .trim()
    .email()
    .transform((e) => e.toLowerCase()),
  phone: z.string().trim().max(40).optional().nullable(),
  planKey: z.string().trim().min(1).default("free"),
  instituteId: z.string().uuid().optional().nullable(),
  instituteName: z.string().trim().max(160).optional().nullable(),
  accessMode: z.enum(["invite", "temp_password"]).default("invite"),
  password: z.string().min(8).max(128).optional().nullable(),
  sendEmail: z.boolean().default(true),
  idempotencyKey: z.string().trim().min(8).max(80),
});

export const createTenantAccountAction = safeAction({
  input: createSchema,
  auth: () => requireTenantAdmin("tenants:create"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-create:${admin.userId}`, 20, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many creates. Try again shortly.");

    const { data: existingIdem } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id, email")
      .eq("email", input.email)
      .maybeSingle();
    if (existingIdem) {
      return safeFail("DUPLICATE_EMAIL", "An account with that email already exists.");
    }

    if (input.tenantType !== "vendor") {
      const { data: plan } = await supabaseAdmin
        .from(TABLES.SUBSCRIPTION_PLANS)
        .select("key, is_active")
        .eq("key", input.planKey)
        .maybeSingle();
      if (!plan || plan.is_active === false) {
        return safeFail("VALIDATION", "Pick an active plan.");
      }
    }

    let instituteId = input.instituteId || null;
    if (!instituteId && input.instituteName?.trim() && input.tenantType === "department") {
      const { data: inst, error: instErr } = await supabaseAdmin
        .from(TABLES.INSTITUTES)
        .upsert({ name: input.instituteName.trim() }, { onConflict: "name" })
        .select("id")
        .single();
      if (instErr || !inst) {
        return safeFail("INTERNAL", "Could not save the institute.");
      }
      instituteId = String(inst.id);
    }

    const password =
      input.accessMode === "temp_password" ? input.password || tempPassword() : tempPassword();
    let uid: string;
    let inviteLink: string | null = null;

    try {
      if (input.accessMode === "invite") {
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email: input.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/change-password`,
            data: {
              full_name: input.name,
              user_type: input.tenantType === "department" ? "organizer" : input.tenantType,
            },
          },
        });
        if (linkErr || !linkData.user) {
          const created = await createAuthUser({
            email: input.email,
            password,
            displayName: input.name,
          });
          uid = created.uid;
        } else {
          uid = linkData.user.id;
          inviteLink = linkData.properties?.action_link ?? null;
        }
      } else {
        const created = await createAuthUser({
          email: input.email,
          password,
          displayName: input.name,
        });
        uid = created.uid;
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        return safeFail("DUPLICATE_EMAIL", "An account with that email already exists.");
      }
      logger.error("[createTenantAccountAction]", {
        err: err instanceof Error ? err.message : "unknown",
      });
      return safeFail("INTERNAL", "Could not create that account.");
    }

    const now = new Date().toISOString();
    const userType = input.tenantType === "department" ? "organizer" : input.tenantType;

    try {
      await supabaseAdmin.from(TABLES.USERS).upsert({
        id: uid,
        email: input.email,
        full_name: input.name,
        user_type: userType,
        account_status: "active",
        must_reset_password: true,
        setup_complete: input.tenantType === "department",
        tenant_provisioned: true,
        created_at: now,
        updated_at: now,
      });

      let departmentId: string | null = null;
      if (input.tenantType === "department") {
        const { data: org, error } = await supabaseAdmin
          .from(TABLES.ORGANIZATIONS)
          .insert({
            name: input.name,
            org_type: "department",
            owner_user_id: uid,
            is_verified: true,
            contact_email: input.email,
            contact_phone: input.phone || null,
            institute_id: instituteId,
          })
          .select("id")
          .single();
        if (error || !org) throw new Error(error?.message || "org insert failed");
        departmentId = String(org.id);
        await supabaseAdmin
          .from(TABLES.ORG_MEMBERSHIPS)
          .upsert(
            { org_id: departmentId, user_id: uid, role: "department_admin" },
            { onConflict: "org_id,user_id" },
          );
      }

      if (input.tenantType === "organizer" || input.tenantType === "department") {
        await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
          user_id: uid,
          org_name: input.name,
          org_id: departmentId,
          plan_type: input.planKey,
          review_status: "approved",
        });
      }
      if (input.tenantType === "vendor") {
        await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
          user_id: uid,
          business_name: input.name,
          business_email: input.email,
          status: "approved",
          plan_type: input.planKey || "vendor_free",
        });
      }
    } catch (err) {
      await deleteAuthUser(uid);
      logger.error("[createTenantAccountAction] domain write", {
        err: err instanceof Error ? err.message : "unknown",
      });
      return safeFail("INTERNAL", "Account setup failed and was rolled back.");
    }

    // Never email or log the password. Domain write already committed.
    mailAccountReady({
      to: input.email,
      userId: uid,
      tenantName: input.name,
      tenantKind: input.tenantType,
      planName: input.planKey,
      inviteUrl: inviteLink,
      sendEmail: input.sendEmail,
    }).catch((err) =>
      logger.warn("[createTenant] mail failed", {
        err: err instanceof Error ? err.message : "unknown",
      }),
    );

    await supabaseAdmin
      .from(TABLES.USERS)
      .update({ welcome_email_sent_at: now, updated_at: now })
      .eq("id", uid);

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/orgs");

    return safeOk({
      userId: uid,
      email: input.email,
      /** Shown once in the UI when accessMode is temp_password — never emailed. */
      temporaryPassword: input.accessMode === "temp_password" ? password : null,
      inviteSent: Boolean(inviteLink && input.sendEmail),
      idempotencyKey: input.idempotencyKey,
    });
  },
});

const approvalSchema = z.object({
  kind: z.enum(["org", "organizer", "vendor"]),
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional().nullable(),
  sendEmail: z.boolean().default(true),
});

export const decideTenantApprovalAction = safeAction({
  input: approvalSchema,
  auth: () => requireTenantAdmin("approvals:manage"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-approval:${admin.userId}`, 60, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many approval actions.");

    if (input.action === "reject" && !input.reason?.trim()) {
      return safeFail("VALIDATION", "A reason is required to reject.");
    }

    let tenantName = "Account";
    let to: string | null = null;
    let userId: string | null = null;
    let entityLabel: string = input.kind;
    let dashboardUrl = "/auth/signin";

    if (input.kind === "org") {
      const { data: org } = await supabaseAdmin
        .from(TABLES.ORGANIZATIONS)
        .select("id, name, contact_email, owner_user_id, org_type")
        .eq("id", input.id)
        .maybeSingle();
      if (!org) return safeFail("NOT_FOUND", "Organization not found.");
      tenantName = String(org.name);
      to = org.contact_email ? String(org.contact_email) : null;
      userId = org.owner_user_id ? String(org.owner_user_id) : null;
      entityLabel = String(org.org_type);
      await supabaseAdmin
        .from(TABLES.ORGANIZATIONS)
        .update({ is_verified: input.action === "approve" })
        .eq("id", input.id);
      dashboardUrl = "/department";
    } else if (input.kind === "vendor") {
      const { data: v } = await supabaseAdmin
        .from(TABLES.VENDOR_PROFILES)
        .select("user_id, business_name, business_email")
        .eq("user_id", input.id)
        .maybeSingle();
      if (!v) return safeFail("NOT_FOUND", "Vendor not found.");
      tenantName = String(v.business_name || "Vendor");
      to = v.business_email ? String(v.business_email) : null;
      userId = String(v.user_id);
      entityLabel = "vendor application";
      await supabaseAdmin
        .from(TABLES.VENDOR_PROFILES)
        .update({ status: input.action === "approve" ? "approved" : "rejected" })
        .eq("user_id", input.id);
      dashboardUrl = `/vendor/${userId}/dashboard`;
    } else {
      const { data: o } = await supabaseAdmin
        .from(TABLES.ORGANIZER_PROFILES)
        .select("user_id, org_name")
        .eq("user_id", input.id)
        .maybeSingle();
      if (!o) return safeFail("NOT_FOUND", "Organizer not found.");
      tenantName = String(o.org_name || "Organizer");
      userId = String(o.user_id);
      const { data: u } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      to = u?.email ? String(u.email) : null;
      entityLabel = "organizer application";
      await supabaseAdmin
        .from(TABLES.ORGANIZER_PROFILES)
        .update({ review_status: input.action === "approve" ? "approved" : "rejected" })
        .eq("user_id", input.id);
      dashboardUrl = `/organizer/${userId}/dashboard`;
    }

    if (input.sendEmail && to && userId) {
      const dash = await absoluteUrl(dashboardUrl);
      mailApprovalDecision({
        to,
        userId,
        tenantName,
        decision: input.action === "approve" ? "approved" : "rejected",
        entityLabel,
        reason: input.reason || null,
        dashboardUrl: dash,
      }).catch((err) =>
        logger.warn("[decideTenantApproval] mail failed", {
          err: err instanceof Error ? err.message : "unknown",
        }),
      );
    }

    revalidatePath("/admin/tenants");
    return safeOk({ id: input.id, action: input.action });
  },
});

/** @deprecated Prefer createTenantAccountAction — kept for any stray form posts. */
export async function createTenantAccount(): Promise<void> {
  throw new Error("Use CreateTenantWizard (createTenantAccountAction).");
}

/** @deprecated Prefer decideTenantApprovalAction */
export async function setTenantVerification(): Promise<void> {
  throw new Error("Use ApprovalsTab (decideTenantApprovalAction).");
}
