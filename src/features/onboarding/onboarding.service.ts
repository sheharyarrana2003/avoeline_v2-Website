import "server-only";

import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { listPlans, type PlanRow } from "@/src/features/saas/saas.service";
import { recordPayment } from "@/src/features/payments/payments.service";
import {
  sendPlanChangedEmail,
  sendTenantInviteEmail,
} from "@/src/features/email/platformMail.service";
import { sendPlatformEmail } from "@/src/lib/email/resend";
import { createElement } from "react";
import { PlatformPlanChangedEmail } from "@/emails/platform-plan-changed";
import { GenericNotificationEmail } from "@/emails/generic-notification";
import { logger } from "@/src/lib/logger";
import { logModeration } from "@/src/features/admin/actions/moderation";
import type { AdminIdentity } from "@/src/features/admin/types";
import { planIsFree } from "@/src/features/onboarding/planHelpers";

export type PlanAudience = "organizer" | "vendor";
export { planIsFree };

const PAYMENT_COLS =
  "id, payer_id, purpose, reference_type, reference_id, total_amount, currency, status, screenshot_url, created_at";

export async function listPlansForAudience(audience: PlanAudience): Promise<PlanRow[]> {
  const plans = await listPlans({ activeOnly: true });
  return plans.filter((p) => {
    const a = String((p as PlanRow & { audience?: string }).audience || "organizer");
    return a === audience || a === "both";
  });
}

export async function getUserOnboarding(userId: string) {
  const { data } = await supabaseAdmin
    .from(TABLES.USERS)
    .select(
      "id, email, full_name, user_type, setup_complete, onboarding_status, pending_plan_key, email_verified",
    )
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function selectFreePlan(opts: {
  userId: string;
  audience: PlanAudience;
  planKey: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const plans = await listPlansForAudience(opts.audience);
  const plan = plans.find((p) => p.key === opts.planKey);
  if (!plan) return { ok: false, error: "Plan not found." };
  if (!planIsFree(plan)) return { ok: false, error: "That plan requires payment." };

  if (opts.audience === "organizer") {
    await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
      user_id: opts.userId,
      plan_type: plan.key,
      // Self-serve free plan → pending admin review (createTenantAccount keeps approved).
      review_status: "pending",
    });
  } else {
    const { data: existing } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("business_name")
      .eq("user_id", opts.userId)
      .maybeSingle();
    await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
      user_id: opts.userId,
      plan_type: plan.key,
      business_name: existing?.business_name || "Vendor",
      status: "pending",
    });
  }

  await supabaseAdmin
    .from(TABLES.USERS)
    .update({
      setup_complete: true,
      onboarding_status: "complete",
      pending_plan_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.userId);

  const { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("email, full_name")
    .eq("id", opts.userId)
    .maybeSingle();
  if (user?.email) {
    await sendTenantInviteEmail({
      to: user.email,
      name: user.full_name || "there",
      tenantLabel: opts.audience,
    }).catch((err) => logger.warn("[selectFreePlan] welcome email", { err: String(err) }));
  }
  return { ok: true };
}

export async function submitPaidPlanScreenshot(opts: {
  userId: string;
  audience: PlanAudience;
  planKey: string;
  screenshotPath: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const plans = await listPlansForAudience(opts.audience);
  const plan = plans.find((p) => p.key === opts.planKey);
  if (!plan) return { ok: false, error: "Plan not found." };
  if (planIsFree(plan)) return { ok: false, error: "Use the free plan path instead." };

  const amount = Number(plan.price_monthly ?? 0);
  // payments.reference_id is uuid — use a correlation id; plan key lives on users.pending_plan_key
  await recordPayment({
    payerId: opts.userId,
    purpose: "subscription",
    referenceType: opts.audience === "organizer" ? "organizer_plan" : "vendor_plan",
    referenceId: randomUUID(),
    totalAmount: amount,
    currency: plan.currency || "PKR",
    status: "pending",
    screenshotUrl: opts.screenshotPath,
  });

  await supabaseAdmin
    .from(TABLES.USERS)
    .update({
      setup_complete: false,
      onboarding_status: "awaiting_payment",
      pending_plan_key: plan.key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.userId);

  const { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("email, full_name")
    .eq("id", opts.userId)
    .maybeSingle();

  if (user?.email) {
    await sendPlatformEmail({
      lane: "billing",
      to: user.email,
      subject: `Payment received — ${plan.name} pending approval`,
      react: createElement(GenericNotificationEmail, {
        heading: "Payment screenshot received",
        body: `Thanks${user.full_name ? `, ${user.full_name}` : ""}. We received your payment screenshot for the ${plan.name} plan. You can use Avoeline after a platform owner approves it (usually 1–2 business days).`,
      }),
    }).catch((err) => logger.warn("[submitPaidPlanScreenshot] user email", { err: String(err) }));
  }

  const owners = String(process.env.SAAS_OWNER_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (owners.length) {
    await sendPlatformEmail({
      lane: "billing",
      to: owners,
      subject: `Subscription payment pending — ${plan.name}`,
      react: createElement(GenericNotificationEmail, {
        heading: "Approve subscription payment",
        body: `${user?.email || opts.userId} submitted a payment screenshot for ${plan.name} (${opts.audience}). Review it under Admin → Billing pending.`,
        actionUrl: undefined,
      }),
    }).catch(() => undefined);
  }

  return { ok: true };
}

export async function listPendingSubscriptionPayments() {
  const { data } = await supabaseAdmin
    .from(TABLES.PAYMENTS)
    .select(PAYMENT_COLS)
    .eq("purpose", "subscription")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function approveSubscriptionPayment(opts: {
  paymentId: string;
  admin: AdminIdentity;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: payment } = await supabaseAdmin
    .from(TABLES.PAYMENTS)
    .select(PAYMENT_COLS)
    .eq("id", opts.paymentId)
    .maybeSingle();
  if (!payment || payment.purpose !== "subscription")
    return { ok: false, error: "Payment not found." };
  if (payment.status !== "pending") return { ok: false, error: "Already processed." };

  const payerId = String(payment.payer_id || "");
  const { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, email, full_name, user_type, pending_plan_key")
    .eq("id", payerId)
    .maybeSingle();
  if (!user) return { ok: false, error: "Payer not found." };

  const planKey = String(user.pending_plan_key || "").trim();
  if (!planKey) return { ok: false, error: "No pending plan on this account." };

  const audience = String(user.user_type).toLowerCase() === "vendor" ? "vendor" : "organizer";
  let fromPlan = audience === "vendor" ? "vendor_free" : "free";

  if (audience === "organizer") {
    const { data: profile } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("plan_type")
      .eq("user_id", payerId)
      .maybeSingle();
    fromPlan = profile?.plan_type || "free";
    await Promise.all([
      supabaseAdmin.from(TABLES.PLAN_CHANGES).insert({
        organizer_id: payerId,
        vendor_id: null,
        from_plan: fromPlan,
        to_plan: planKey,
        changed_by: opts.admin.userId,
        reason: "Subscription payment approved",
      }),
      supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
        user_id: payerId,
        plan_type: planKey,
        // Owner payment approval also clears profile review.
        review_status: "approved",
      }),
    ]);
  } else {
    const { data: profile } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("plan_type, business_name")
      .eq("user_id", payerId)
      .maybeSingle();
    fromPlan = profile?.plan_type || "vendor_free";
    await Promise.all([
      supabaseAdmin.from(TABLES.PLAN_CHANGES).insert({
        organizer_id: null,
        vendor_id: payerId,
        from_plan: fromPlan,
        to_plan: planKey,
        changed_by: opts.admin.userId,
        reason: "Subscription payment approved",
      }),
      supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
        user_id: payerId,
        plan_type: planKey,
        business_name: profile?.business_name || user.full_name || "Vendor",
        status: "approved",
      }),
    ]);
  }

  const now = new Date().toISOString();
  await Promise.all([
    supabaseAdmin
      .from(TABLES.PAYMENTS)
      .update({ status: "verified", screenshot_verified: true, updated_at: now })
      .eq("id", opts.paymentId),
    supabaseAdmin
      .from(TABLES.USERS)
      .update({
        setup_complete: true,
        onboarding_status: "complete",
        pending_plan_key: null,
        updated_at: now,
      })
      .eq("id", payerId),
  ]);

  await logModeration({
    admin: opts.admin,
    targetType: audience,
    targetId: payerId,
    targetLabel: user.email || user.full_name || payerId,
    action: "approved",
    reason: `Subscription payment ${opts.paymentId} → plan ${planKey}`,
  });

  if (audience === "organizer") {
    await sendPlanChangedEmail({
      organizerId: payerId,
      fromPlan,
      toPlan: planKey,
      reason: "Payment approved",
    }).catch(() => undefined);
  } else if (user.email) {
    await sendPlatformEmail({
      lane: "billing",
      to: user.email,
      subject: `Your ${planKey} plan is active`,
      react: createElement(PlatformPlanChangedEmail, {
        name: user.full_name || undefined,
        fromPlan,
        toPlan: planKey,
        reason: "Payment approved",
      }),
    }).catch(() => undefined);
  }

  return { ok: true };
}

export async function rejectSubscriptionPayment(opts: {
  paymentId: string;
  admin: AdminIdentity;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: payment } = await supabaseAdmin
    .from(TABLES.PAYMENTS)
    .select(PAYMENT_COLS)
    .eq("id", opts.paymentId)
    .maybeSingle();
  if (!payment || payment.purpose !== "subscription")
    return { ok: false, error: "Payment not found." };
  if (payment.status !== "pending") return { ok: false, error: "Already processed." };

  const payerId = String(payment.payer_id || "");
  const now = new Date().toISOString();

  const { data: user } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("email, full_name, user_type, pending_plan_key")
    .eq("id", payerId)
    .maybeSingle();

  await Promise.all([
    supabaseAdmin
      .from(TABLES.PAYMENTS)
      .update({ status: "failed", updated_at: now })
      .eq("id", opts.paymentId),
    supabaseAdmin
      .from(TABLES.USERS)
      .update({
        onboarding_status: "incomplete",
        updated_at: now,
      })
      .eq("id", payerId),
  ]);
  const audience =
    String(user?.user_type || "").toLowerCase() === "vendor" ? "vendor" : "organizer";

  await logModeration({
    admin: opts.admin,
    targetType: audience,
    targetId: payerId,
    targetLabel: user?.email || user?.full_name || payerId,
    action: "rejected",
    reason: opts.reason || `Subscription payment ${opts.paymentId} rejected`,
  });

  if (user?.email) {
    await sendPlatformEmail({
      lane: "billing",
      to: user.email,
      subject: "Subscription payment needs attention",
      react: createElement(GenericNotificationEmail, {
        heading: "Payment not approved",
        body: `${opts.reason || "Your payment screenshot could not be verified."} You can upload a new screenshot from setup and try again.`,
      }),
    }).catch(() => undefined);
  }

  return { ok: true };
}
