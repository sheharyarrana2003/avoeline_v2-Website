import "server-only";

import { createElement } from "react";
import { randomUUID } from "crypto";
import { AccountReadyEmail } from "@/emails/account-ready";
import { AccessUpdatedEmail, type AccessChangeLine } from "@/emails/access-updated";
import { AccessEndedEmail } from "@/emails/access-ended";
import { PricingUpdatedEmail } from "@/emails/pricing-updated";
import { ApprovalDecisionEmail } from "@/emails/approval-decision";
import { PlatformPlanChangedEmail } from "@/emails/platform-plan-changed";
import {
  appendCoalescePayload,
  findOpenCoalesceBatch,
  sanitizeEmailPayload,
  sendLoggedPlatformEmail,
} from "@/src/features/email/emailLog.service";
import { NotificationServices } from "@/src/services/notification.services";
import { absoluteUrl } from "@/src/lib/appUrl";

function dashboardFor(userId: string, kind: "organizer" | "vendor" | "department"): string {
  if (kind === "vendor") return `/vendor/${userId}/dashboard`;
  if (kind === "department") return `/department`;
  return `/organizer/${userId}/dashboard`;
}

/** Account ready / invite — never pass a password. */
export async function mailAccountReady(opts: {
  to: string;
  userId: string;
  tenantName: string;
  tenantKind: "organizer" | "vendor" | "department";
  planName?: string | null;
  inviteUrl?: string | null;
  sendEmail?: boolean;
}): Promise<void> {
  const dash = await absoluteUrl(dashboardFor(opts.userId, opts.tenantKind));
  await sendLoggedPlatformEmail({
    kind: "admin_account_setup",
    to: opts.to,
    userId: opts.userId,
    subject: "Your Avoeline account is ready",
    send: opts.sendEmail !== false,
    react: createElement(AccountReadyEmail, {
      tenantName: opts.tenantName,
      dashboardUrl: dash,
      inviteUrl: opts.inviteUrl || null,
      planName: opts.planName || null,
    }),
    text: `Hello ${opts.tenantName}. Your Avoeline account is ready. ${opts.inviteUrl ? `Set your password: ${opts.inviteUrl}` : `Sign in: ${dash}`}`,
    payload: sanitizeEmailPayload({
      tenantName: opts.tenantName,
      planName: opts.planName,
      hasInvite: !!opts.inviteUrl,
    }),
    idempotencyKey: `account-ready:${opts.userId}:${Date.now()}`,
  });
  await NotificationServices.createNotification({
    userId: opts.userId,
    title: "Your account is ready",
    message: "An administrator created your Avoeline account.",
    type: "category_request",
    deepLink: dashboardFor(opts.userId, opts.tenantKind),
  }).catch(() => undefined);
}

export async function mailPlanChanged(opts: {
  to: string;
  userId: string;
  tenantName: string;
  fromPlan: string;
  toPlan: string;
  reason?: string | null;
  includeReason?: boolean;
  sendEmail?: boolean;
  tenantKind?: "organizer" | "vendor" | "department";
}): Promise<void> {
  const reason = opts.includeReason ? opts.reason : null;
  await sendLoggedPlatformEmail({
    kind: "billing_notice",
    to: opts.to,
    userId: opts.userId,
    subject: `Your Avoeline plan is now ${opts.toPlan}`,
    send: opts.sendEmail !== false,
    react: createElement(PlatformPlanChangedEmail, {
      name: opts.tenantName,
      fromPlan: opts.fromPlan,
      toPlan: opts.toPlan,
      reason,
    }),
    text: `Hello ${opts.tenantName}. Plan changed from ${opts.fromPlan} to ${opts.toPlan}.${reason ? ` Note: ${reason}` : ""}`,
    payload: sanitizeEmailPayload({
      fromPlan: opts.fromPlan,
      toPlan: opts.toPlan,
      reason,
    }),
  });
  await NotificationServices.createNotification({
    userId: opts.userId,
    title: "Plan updated",
    message: `Your plan changed from ${opts.fromPlan} to ${opts.toPlan}.`,
    type: "plan_change",
    deepLink: dashboardFor(opts.userId, opts.tenantKind || "organizer"),
  }).catch(() => undefined);
}

/** Coalesce access updates within 10 minutes into one summary email. */
export async function mailAccessUpdated(opts: {
  to: string;
  userId: string;
  tenantName: string;
  changes: AccessChangeLine[];
  reason?: string | null;
  includeReason?: boolean;
  sendEmail?: boolean;
  tenantKind?: "organizer" | "vendor" | "department";
}): Promise<void> {
  if (!opts.changes.length) return;
  const dash = await absoluteUrl(dashboardFor(opts.userId, opts.tenantKind || "organizer"));
  const reason = opts.includeReason ? opts.reason : null;

  if (opts.sendEmail === false) {
    await sendLoggedPlatformEmail({
      kind: "owner_notification",
      to: opts.to,
      userId: opts.userId,
      subject: "Your access was updated",
      send: false,
      payload: sanitizeEmailPayload({ changes: opts.changes, reason }),
    });
  } else {
    const open = await findOpenCoalesceBatch({ kind: "owner_notification", userId: opts.userId });
    if (open) {
      await appendCoalescePayload(open.id, opts.changes);
    } else {
      const batchKey = `access:${opts.userId}:${randomUUID()}`;
      await sendLoggedPlatformEmail({
        kind: "owner_notification",
        to: opts.to,
        userId: opts.userId,
        subject: "Your access was updated",
        send: true,
        batchKey,
        react: createElement(AccessUpdatedEmail, {
          tenantName: opts.tenantName,
          changes: opts.changes,
          dashboardUrl: dash,
          reason,
        }),
        text: `Hello ${opts.tenantName}. Access updated: ${opts.changes.map((c) => `${c.feature} ${c.before}→${c.after}`).join("; ")}`,
        payload: sanitizeEmailPayload({ changes: opts.changes, reason }),
      });
    }
  }

  await NotificationServices.createNotification({
    userId: opts.userId,
    title: "Access updated",
    message: opts.changes.map((c) => `${c.feature}: ${c.after}`).join(", "),
    type: "plan_change",
    deepLink: dashboardFor(opts.userId, opts.tenantKind || "organizer"),
  }).catch(() => undefined);
}

export async function mailAccessEnded(opts: {
  to: string;
  userId: string;
  tenantName: string;
  features: string[];
  tenantKind?: "organizer" | "vendor" | "department";
}): Promise<void> {
  if (!opts.features.length) return;
  const dash = await absoluteUrl(dashboardFor(opts.userId, opts.tenantKind || "organizer"));
  await sendLoggedPlatformEmail({
    kind: "owner_notification",
    to: opts.to,
    userId: opts.userId,
    subject: "Access override ended",
    react: createElement(AccessEndedEmail, {
      tenantName: opts.tenantName,
      features: opts.features,
      dashboardUrl: dash,
    }),
    text: `Hello ${opts.tenantName}. Expired access: ${opts.features.join(", ")}`,
    payload: sanitizeEmailPayload({ features: opts.features }),
  });
}

export async function mailPricingUpdated(opts: {
  to: string;
  userId: string;
  tenantName: string;
  summary: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  sendEmail?: boolean;
}): Promise<void> {
  const dash = await absoluteUrl(dashboardFor(opts.userId, "organizer"));
  await sendLoggedPlatformEmail({
    kind: "billing_notice",
    to: opts.to,
    userId: opts.userId,
    subject: "Custom pricing updated",
    send: opts.sendEmail !== false,
    react: createElement(PricingUpdatedEmail, {
      tenantName: opts.tenantName,
      summary: opts.summary,
      effectiveFrom: opts.effectiveFrom,
      effectiveUntil: opts.effectiveUntil,
      dashboardUrl: dash,
    }),
    text: `Hello ${opts.tenantName}. ${opts.summary}`,
    payload: sanitizeEmailPayload({
      summary: opts.summary,
      effectiveFrom: opts.effectiveFrom,
      effectiveUntil: opts.effectiveUntil,
    }),
  });
}

export async function mailApprovalDecision(opts: {
  to: string;
  userId: string;
  tenantName: string;
  decision: "approved" | "rejected";
  entityLabel: string;
  reason?: string | null;
  dashboardUrl: string;
}): Promise<void> {
  await sendLoggedPlatformEmail({
    kind: "owner_notification",
    to: opts.to,
    userId: opts.userId,
    subject: opts.decision === "approved" ? "You were approved" : "Application update",
    react: createElement(ApprovalDecisionEmail, {
      tenantName: opts.tenantName,
      decision: opts.decision,
      entityLabel: opts.entityLabel,
      reason: opts.reason,
      dashboardUrl: opts.dashboardUrl,
    }),
    text: `Hello ${opts.tenantName}. Your ${opts.entityLabel} was ${opts.decision}.${opts.reason ? ` Reason: ${opts.reason}` : ""}`,
    payload: sanitizeEmailPayload({
      decision: opts.decision,
      entityLabel: opts.entityLabel,
      reason: opts.reason,
    }),
  });
}
