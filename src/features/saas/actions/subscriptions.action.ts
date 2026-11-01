"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { canTenantCap } from "@/src/features/admin/types";
import { isModuleKey, MODULE_LABELS } from "@/src/features/permissions/moduleKeys";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import {
  mailAccessUpdated,
  mailPlanChanged,
  mailPricingUpdated,
} from "@/src/features/email/tenantMail.service";
import { createPlatformAlert } from "@/src/features/admin/platformAlerts.service";
import { logger } from "@/src/lib/logger";
import { overrideConflictKey } from "@/src/features/saas/tenantBoard.filters";

async function requireTenantAdmin(cap: Parameters<typeof canTenantCap>[1]) {
  const admin = await AuthService.requireAdmin("tenants");
  if (!admin) return safeFail("UNAUTHORIZED", "Please sign in as an admin.");
  if (!canTenantCap(admin, cap)) {
    return safeFail("FORBIDDEN", "You do not have permission for this action.");
  }
  return admin;
}

async function tenantContact(userId: string): Promise<{ email: string; name: string } | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.email) return null;
  return { email: String(data.email), name: String(data.full_name || data.email) };
}

const changePlanSchema = z.object({
  tenantId: z.string().uuid(),
  tenantKind: z.enum(["organizer", "vendor", "department"]),
  toPlan: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional().nullable(),
  sendEmail: z.boolean().default(true),
  includeReason: z.boolean().default(true),
  previewOnly: z.boolean().optional(),
});

export const changePlanAction = safeAction({
  input: changePlanSchema,
  auth: () => requireTenantAdmin("plans:change"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-plan:${admin.userId}`, 40, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many plan changes.");

    const { data: plan } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("key, name, is_active, price_monthly")
      .eq("key", input.toPlan)
      .maybeSingle();
    if (!plan || plan.is_active === false) {
      return safeFail("VALIDATION", "That plan doesn't exist or is inactive.");
    }

    let fromPlan = "free";
    let contact = await tenantContact(input.tenantId);

    if (input.tenantKind === "vendor") {
      const { data: profile } = await supabaseAdmin
        .from(TABLES.VENDOR_PROFILES)
        .select("plan_type, business_name, business_email")
        .eq("user_id", input.tenantId)
        .maybeSingle();
      if (!profile) return safeFail("NOT_FOUND", "Vendor not found.");
      fromPlan = String(profile.plan_type || "vendor_free");
      if (!contact && profile.business_email) {
        contact = {
          email: String(profile.business_email),
          name: String(profile.business_name || profile.business_email),
        };
      }
    } else {
      const { data: profile } = await supabaseAdmin
        .from(TABLES.ORGANIZER_PROFILES)
        .select("plan_type, org_name")
        .eq("user_id", input.tenantId)
        .maybeSingle();
      if (!profile) return safeFail("NOT_FOUND", "Organizer not found.");
      fromPlan = String(profile.plan_type || "free");
      if (contact && profile.org_name) contact = { ...contact, name: String(profile.org_name) };
    }

    const { data: fromPlanRow } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("price_monthly")
      .eq("key", fromPlan)
      .maybeSingle();
    const fromPrice = Number(fromPlanRow?.price_monthly ?? 0);
    const toPrice = Number(plan.price_monthly ?? 0);
    const isDowngrade = toPrice < fromPrice;

    if (input.previewOnly) {
      return safeOk({
        fromPlan,
        toPlan: input.toPlan,
        toPlanName: String(plan.name),
        isDowngrade,
        requiresReason: isDowngrade,
        applied: false,
      });
    }

    if (isDowngrade && !input.reason?.trim()) {
      return safeFail("VALIDATION", "A reason is required when downgrading.");
    }

    if (input.tenantKind === "vendor") {
      await supabaseAdmin.from(TABLES.PLAN_CHANGES).insert({
        organizer_id: null,
        vendor_id: input.tenantId,
        from_plan: fromPlan,
        to_plan: input.toPlan,
        changed_by: admin.userId,
        reason: input.reason || null,
      });
      await supabaseAdmin
        .from(TABLES.VENDOR_PROFILES)
        .update({ plan_type: input.toPlan })
        .eq("user_id", input.tenantId);
    } else {
      await supabaseAdmin.from(TABLES.PLAN_CHANGES).insert({
        organizer_id: input.tenantId,
        from_plan: fromPlan,
        to_plan: input.toPlan,
        changed_by: admin.userId,
        reason: input.reason || null,
      });
      await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
        user_id: input.tenantId,
        plan_type: input.toPlan,
      });
    }

    if (contact) {
      mailPlanChanged({
        to: contact.email,
        userId: input.tenantId,
        tenantName: contact.name,
        fromPlan,
        toPlan: String(plan.name || input.toPlan),
        reason: input.reason,
        includeReason: input.includeReason,
        sendEmail: input.sendEmail,
        tenantKind: input.tenantKind === "department" ? "department" : input.tenantKind,
      }).catch((err) =>
        logger.warn("[changePlanAction] mail failed", {
          err: err instanceof Error ? err.message : "unknown",
        }),
      );
    }

    await createPlatformAlert({
      kind: "plan_changed",
      title: `Plan: ${fromPlan} → ${input.toPlan}`,
      body: input.reason || `${input.tenantId} moved from ${fromPlan} to ${input.toPlan}.`,
      href: "/admin/tenants",
      targetUserId: input.tenantId,
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin");
    return safeOk({
      fromPlan,
      toPlan: input.toPlan,
      toPlanName: String(plan.name),
      isDowngrade,
      requiresReason: isDowngrade,
      applied: true,
    });
  },
});

const grantDenySchema = z.object({
  changes: z
    .array(
      z.object({
        moduleKey: z.string().min(1),
        effect: z.enum(["grant", "deny", "clear", "plan_default"]),
        expiresAt: z.string().optional().nullable(),
      }),
    )
    .min(1)
    .max(40),
  organizerId: z.string().uuid().optional().nullable(),
  targetOrgId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
  sendEmail: z.boolean().default(true),
  includeReason: z.boolean().default(true),
  previewOnly: z.boolean().optional(),
});

export const grantDenyClearAction = safeAction({
  input: grantDenySchema,
  auth: () => requireTenantAdmin("grants:manage"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-grants:${admin.userId}`, 40, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many grant actions.");

    if (!input.organizerId && !input.targetOrgId) {
      return safeFail("VALIDATION", "Choose an organizer or organization.");
    }

    for (const c of input.changes) {
      if (!isModuleKey(c.moduleKey)) {
        return safeFail("VALIDATION", `Invalid module: ${c.moduleKey}`);
      }
      if ((c.effect === "deny" || c.effect === "clear") && !input.reason?.trim()) {
        return safeFail("VALIDATION", "A reason is required to deny or clear.");
      }
    }

    if (input.previewOnly) {
      return safeOk({
        updated: 0,
        preview: input.changes.map((c) => ({
          moduleKey: c.moduleKey,
          label: MODULE_LABELS[c.moduleKey as keyof typeof MODULE_LABELS] || c.moduleKey,
          effect: c.effect,
          expiresAt: c.expiresAt || null,
          conflictKey: overrideConflictKey({
            organizerId: input.organizerId,
            targetOrgId: input.targetOrgId,
            moduleKey: c.moduleKey,
          }),
        })),
      });
    }

    const mailLines: { feature: string; before: string; after: string }[] = [];

    for (const c of input.changes) {
      if (c.effect === "plan_default" || c.effect === "clear") {
        let q = supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).delete().eq("module_key", c.moduleKey);
        q = input.organizerId
          ? q.eq("organizer_id", input.organizerId)
          : q.is("organizer_id", null);
        q = input.targetOrgId
          ? q.eq("target_org_id", input.targetOrgId)
          : q.is("target_org_id", null);
        await q;
        mailLines.push({
          feature: MODULE_LABELS[c.moduleKey as keyof typeof MODULE_LABELS] || c.moduleKey,
          before: "override",
          after: "plan default",
        });
        continue;
      }

      // Upsert via delete+insert under unique indexes
      let del = supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).delete().eq("module_key", c.moduleKey);
      del = input.organizerId
        ? del.eq("organizer_id", input.organizerId)
        : del.is("organizer_id", null);
      del = input.targetOrgId
        ? del.eq("target_org_id", input.targetOrgId)
        : del.is("target_org_id", null);
      await del;

      await supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).insert({
        organizer_id: input.organizerId || null,
        target_org_id: input.targetOrgId || null,
        module_key: c.moduleKey,
        granted_by: admin.userId,
        reason: input.reason || null,
        expires_at: c.expiresAt || null,
        denied: c.effect === "deny",
      });

      mailLines.push({
        feature: MODULE_LABELS[c.moduleKey as keyof typeof MODULE_LABELS] || c.moduleKey,
        before: "plan default",
        after: c.effect === "deny" ? "denied" : "granted",
      });
    }

    const userId = input.organizerId;
    if (userId && mailLines.length) {
      const contact = await tenantContact(userId);
      if (contact) {
        mailAccessUpdated({
          to: contact.email,
          userId,
          tenantName: contact.name,
          changes: mailLines,
          reason: input.reason,
          includeReason: input.includeReason,
          sendEmail: input.sendEmail,
        }).catch((err) =>
          logger.warn("[grantDenyClearAction] mail failed", {
            err: err instanceof Error ? err.message : "unknown",
          }),
        );
      }
    }

    await createPlatformAlert({
      kind: "feature_override",
      title: `Access changes (${input.changes.length})`,
      body: input.reason || `${input.changes.length} override update(s)`,
      href: "/admin/tenants",
      targetUserId: input.organizerId || null,
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin");
    return safeOk({
      updated: input.changes.length,
      preview: [] as {
        moduleKey: string;
        label: string;
        effect: "grant" | "deny" | "clear" | "plan_default";
        expiresAt: string | null;
        conflictKey: string;
      }[],
    });
  },
});

const pricingSchema = z.object({
  agreementId: z.string().uuid().optional().nullable(),
  organizerId: z.string().uuid(),
  discountPct: z.number().min(0).max(100).optional().nullable(),
  flatMonthly: z.number().min(0).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  endAgreement: z.boolean().optional(),
  sendEmail: z.boolean().default(true),
});

export const saveCustomPricingAction = safeAction({
  input: pricingSchema,
  auth: () => requireTenantAdmin("pricing:manage"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-pricing:${admin.userId}`, 30, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many pricing updates.");

    if (input.endAgreement && input.agreementId) {
      await supabaseAdmin
        .from(TABLES.CUSTOM_PRICING_AGREEMENTS)
        .update({ active: false })
        .eq("id", input.agreementId);
      revalidatePath("/admin/tenants");
      return safeOk({ saved: true, ended: true, summary: "Ended" });
    }

    await supabaseAdmin
      .from(TABLES.CUSTOM_PRICING_AGREEMENTS)
      .update({ active: false })
      .eq("organizer_id", input.organizerId)
      .eq("active", true);

    await supabaseAdmin.from(TABLES.CUSTOM_PRICING_AGREEMENTS).insert({
      organizer_id: input.organizerId,
      discount_pct: input.discountPct ?? null,
      flat_monthly_override: input.flatMonthly ?? null,
      notes: input.notes || null,
      set_by: admin.userId,
      active: true,
    });

    const summaryBits = [
      input.discountPct != null ? `${input.discountPct}% discount` : null,
      input.flatMonthly != null ? `flat ${input.flatMonthly}/mo` : null,
    ].filter(Boolean);
    const summary = summaryBits.join(" · ") || "Custom pricing updated.";

    const contact = await tenantContact(input.organizerId);
    if (contact) {
      mailPricingUpdated({
        to: contact.email,
        userId: input.organizerId,
        tenantName: contact.name,
        summary,
        sendEmail: input.sendEmail,
      }).catch((err) =>
        logger.warn("[saveCustomPricingAction] mail failed", {
          err: err instanceof Error ? err.message : "unknown",
        }),
      );
    }

    await createPlatformAlert({
      kind: "custom_pricing",
      title: "Custom pricing agreement",
      body: summary,
      href: "/admin/tenants",
      targetUserId: input.organizerId,
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin");
    return safeOk({ saved: true, ended: false, summary });
  },
});

const bulkClearSchema = z.object({
  overrideIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().trim().min(1).max(500),
  sendEmail: z.boolean().default(true),
});

export const bulkClearOverridesAction = safeAction({
  input: bulkClearSchema,
  auth: () => requireTenantAdmin("grants:manage"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-bulk-clear:${admin.userId}`, 20, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many bulk clears.");

    const { data: rows } = await supabaseAdmin
      .from(TABLES.FEATURE_OVERRIDES)
      .select("id, organizer_id, module_key")
      .in("id", input.overrideIds);

    await supabaseAdmin.from(TABLES.FEATURE_OVERRIDES).delete().in("id", input.overrideIds);

    const byUser = new Map<string, string[]>();
    for (const r of rows ?? []) {
      if (!r.organizer_id) continue;
      const list = byUser.get(String(r.organizer_id)) ?? [];
      list.push(String(r.module_key));
      byUser.set(String(r.organizer_id), list);
    }

    for (const [userId, modules] of byUser) {
      const contact = await tenantContact(userId);
      if (!contact) continue;
      mailAccessUpdated({
        to: contact.email,
        userId,
        tenantName: contact.name,
        changes: modules.map((m) => ({
          feature: MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m,
          before: "override",
          after: "cleared",
        })),
        reason: input.reason,
        includeReason: true,
        sendEmail: input.sendEmail,
      }).catch(() => undefined);
    }

    revalidatePath("/admin/tenants");
    return safeOk({ cleared: input.overrideIds.length });
  },
});

const resendSchema = z.object({
  emailLogId: z.string().uuid(),
});

export const resendFailedEmailAction = safeAction({
  input: resendSchema,
  auth: () => requireTenantAdmin("tenants:create"),
  async run(input, admin) {
    const rl = rateLimit(`tenant-resend:${admin.userId}`, 20, 60);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many resends.");

    const { data: row } = await supabaseAdmin
      .from(TABLES.EMAIL_LOG)
      .select("id, recipient, subject, status, kind, user_id")
      .eq("id", input.emailLogId)
      .maybeSingle();
    if (!row) return safeFail("NOT_FOUND", "Email log not found.");
    if (row.status !== "failed" && row.status !== "bounced") {
      return safeFail("VALIDATION", "Only failed or bounced emails can be resent.");
    }

    const { sendPlatformEmail } = await import("@/src/lib/email/resend");
    const { insertEmailLog, updateEmailLogStatus } =
      await import("@/src/features/email/emailLog.service");
    const result = await sendPlatformEmail({
      lane: "notifications",
      to: String(row.recipient),
      subject: `[Resend] ${row.subject}`,
      text: `This is a resend of a previous platform email (${row.kind}). Please check your dashboard for details.`,
    });

    if (result.ok) {
      await updateEmailLogStatus(String(row.id), {
        status: "sent",
        providerId: "id" in result ? String(result.id || "") : null,
        sentAt: new Date().toISOString(),
        error: null,
      });
      await insertEmailLog({
        kind: (row.kind as "owner_notification") || "owner_notification",
        recipient: String(row.recipient),
        userId: row.user_id ? String(row.user_id) : null,
        subject: `[Resend] ${row.subject}`,
        status: "sent",
        payload: { resentFrom: row.id },
        sentAt: new Date().toISOString(),
      });
    }

    revalidatePath("/admin/tenants");
    return result.ok
      ? safeOk({ resent: true })
      : safeFail("INTERNAL", "Resend failed. Try again later.");
  },
});

/** Legacy FormData wrappers removed — use the safeAction exports above. */
export async function changeOrganizerPlan(): Promise<void> {
  throw new Error("Use changePlanAction.");
}
export async function grantFeatureOverride(): Promise<void> {
  throw new Error("Use grantDenyClearAction.");
}
export async function clearFeatureOverride(): Promise<void> {
  throw new Error("Use grantDenyClearAction or bulkClearOverridesAction.");
}
export async function saveCustomPricing(): Promise<void> {
  throw new Error("Use saveCustomPricingAction.");
}
