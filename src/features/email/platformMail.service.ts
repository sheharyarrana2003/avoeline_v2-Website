import "server-only";

import { createElement } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { PlatformWelcomeEmail } from "@/emails/platform-welcome";
import { PlatformPlanChangedEmail } from "@/emails/platform-plan-changed";
import { PlatformInvoiceSummaryEmail } from "@/emails/platform-invoice-summary";
import { PlatformAnnouncementEmail } from "@/emails/platform-announcement";
import { PlatformSupportUpdateEmail } from "@/emails/platform-support-update";
import { sendPlatformEmail, type ResendSendResult } from "@/src/lib/email/resend";
import { logger } from "@/src/lib/logger";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function userEmail(userId: string): Promise<{ email: string; name?: string } | null> {
  const id = String(userId ?? "").trim();
  if (!id) return null;
  if (looksLikeEmail(id)) return { email: id };
  const { data } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("email, full_name")
    .eq("id", id)
    .maybeSingle();
  if (!data?.email || !looksLikeEmail(data.email)) return null;
  return { email: data.email, name: data.full_name || undefined };
}

/** Prefer `mailAccountReady` — never emails a password. */
export async function sendTenantInviteEmail(opts: {
  to: string;
  name: string;
  inviteUrl?: string | null;
  tenantLabel?: string;
  /** @deprecated Ignored — passwords must never be emailed. */
  temporaryPassword?: string | null;
  changeByLabel?: string;
}): Promise<boolean> {
  if (!looksLikeEmail(opts.to)) return false;
  void opts.temporaryPassword;
  void opts.changeByLabel;
  const linkLine = opts.inviteUrl ? ` Open your account: ${opts.inviteUrl}` : "";
  const result = await sendPlatformEmail({
    lane: "onboarding",
    to: opts.to,
    subject: "Your Avoeline account",
    react: createElement(PlatformWelcomeEmail, {
      name: opts.name,
      inviteUrl: opts.inviteUrl || undefined,
      tenantLabel: opts.tenantLabel,
    }),
    text: `Hello ${opts.name}. An administrator created your Avoeline account.${linkLine}`,
  });
  if (!result.ok) logger.warn("[sendTenantInviteEmail]", { error: result.error });
  return result.ok;
}

export async function sendPlanChangedEmail(opts: {
  organizerId: string;
  fromPlan: string;
  toPlan: string;
  reason?: string | null;
}): Promise<ResendSendResult> {
  const contact = await userEmail(opts.organizerId);
  if (!contact) return { ok: false, error: "No organizer email" };
  return sendPlatformEmail({
    lane: "billing",
    to: contact.email,
    subject: `Your Avoeline plan is now ${opts.toPlan}`,
    react: createElement(PlatformPlanChangedEmail, {
      name: contact.name,
      fromPlan: opts.fromPlan,
      toPlan: opts.toPlan,
      reason: opts.reason,
    }),
  });
}

export async function sendInvoiceSummaryEmail(opts: {
  organizerId: string;
  planName: string;
  periodLabel?: string;
  amountLabel?: string;
  notes?: string | null;
}): Promise<ResendSendResult> {
  const contact = await userEmail(opts.organizerId);
  if (!contact) return { ok: false, error: "No organizer email" };
  return sendPlatformEmail({
    lane: "billing",
    to: contact.email,
    subject: `Billing summary — ${opts.planName}`,
    react: createElement(PlatformInvoiceSummaryEmail, {
      name: contact.name,
      planName: opts.planName,
      periodLabel: opts.periodLabel,
      amountLabel: opts.amountLabel,
      notes: opts.notes,
    }),
  });
}

export async function sendPlatformAnnouncementEmail(opts: {
  to: string | string[];
  title: string;
  body: string;
  actionUrl?: string;
}): Promise<ResendSendResult> {
  return sendPlatformEmail({
    lane: "notifications",
    to: opts.to,
    subject: opts.title,
    react: createElement(PlatformAnnouncementEmail, {
      title: opts.title,
      body: opts.body,
      actionUrl: opts.actionUrl,
    }),
  });
}

export async function sendSupportStatusEmail(opts: {
  toUserId: string;
  subject: string;
  status: string;
  body?: string;
  actionUrl?: string;
}): Promise<ResendSendResult> {
  const contact = await userEmail(opts.toUserId);
  if (!contact) return { ok: false, error: "No recipient email" };
  return sendPlatformEmail({
    lane: "support",
    to: contact.email,
    subject: `Support update: ${opts.subject}`,
    react: createElement(PlatformSupportUpdateEmail, {
      subject: opts.subject,
      status: opts.status,
      body: opts.body,
      actionUrl: opts.actionUrl,
    }),
  });
}

export async function sendStaffAccountEmail(opts: {
  to: string;
  name?: string;
  action: "created" | "updated" | "revoked";
  permissions?: string[];
}): Promise<ResendSendResult> {
  if (!looksLikeEmail(opts.to)) return { ok: false, error: "Invalid staff email" };
  const name = opts.name?.trim() || "there";
  const permLine =
    opts.permissions && opts.permissions.length ? ` Areas: ${opts.permissions.join(", ")}.` : "";
  const copy =
    opts.action === "created"
      ? `Hello ${name}. You have been added as platform staff on Avoeline.${permLine} Sign in at /admin/signin.`
      : opts.action === "updated"
        ? `Hello ${name}. Your Avoeline staff permissions were updated.${permLine}`
        : `Hello ${name}. Your Avoeline platform staff access has been revoked.`;
  const subject =
    opts.action === "created"
      ? "You were added as Avoeline platform staff"
      : opts.action === "updated"
        ? "Your Avoeline staff permissions were updated"
        : "Your Avoeline staff access was revoked";
  return sendPlatformEmail({
    lane: "security",
    to: opts.to,
    subject,
    react: createElement(PlatformAnnouncementEmail, {
      title: subject,
      body: copy,
      actionUrl: opts.action === "revoked" ? undefined : "/admin/signin",
    }),
    text: copy,
  });
}

export async function sendPlanExpiryReminderEmail(opts: {
  organizerId: string;
  planName: string;
  expiresAt: string;
}): Promise<ResendSendResult> {
  const contact = await userEmail(opts.organizerId);
  if (!contact) return { ok: false, error: "No organizer email" };
  const when = new Date(opts.expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const body = `Your Avoeline plan (${opts.planName}) expires on ${when}. Renew or contact the platform team if you need help.`;
  return sendPlatformEmail({
    lane: "billing",
    to: contact.email,
    subject: `Your Avoeline plan expires in 5 days`,
    react: createElement(PlatformAnnouncementEmail, {
      title: "Plan expiry reminder",
      body,
    }),
    text: `Hello ${contact.name || "there"}. ${body}`,
  });
}
