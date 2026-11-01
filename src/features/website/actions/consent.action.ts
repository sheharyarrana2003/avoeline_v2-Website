"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { AuthService } from "@/src/features/auth/authService";
import { sendPlatformEmail } from "@/src/lib/email/resend";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { COMMUNITY_SEND_CAP, hashIp, requireLegalAcceptance } from "../consent.logic";
import {
  getAppOrigin,
  grantMarketingConsent,
  recordLegalAcceptance,
  unsubscribeUrlFor,
  withdrawById,
  withdrawByToken,
  listActiveMarketingConsents,
} from "../consent.service";

async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "anon";
  return hashIp(ip);
}

export const recordSignupConsentsAction = safeAction({
  input: z.object({
    email: z.string().email().max(320),
    userId: z.string().uuid().optional().nullable(),
    role: z.string().trim().min(1).max(40),
    legalAccepted: z.boolean(),
    communityOptIn: z.boolean().default(false),
    source: z.enum(["signup", "google_signup"]).default("signup"),
  }),
  async run(input) {
    const legal = requireLegalAcceptance(input.legalAccepted);
    if (!legal.ok) return safeFail("VALIDATION", legal.error);

    const ipHash = await clientIpHash();
    const context = `${input.source}_${input.role.toLowerCase()}`;
    const legalRes = await recordLegalAcceptance({
      userId: input.userId,
      email: input.email,
      context,
      ipHash,
    });
    if (!legalRes.ok) return safeFail("CONSENT_FAILED", legalRes.error);

    if (input.communityOptIn) {
      const m = await grantMarketingConsent({
        email: input.email,
        userId: input.userId,
        source: input.source,
      });
      if (!m.ok) return safeFail("CONSENT_FAILED", m.error);
    }
    return safeOk({ recorded: true });
  },
});

export const recordRegistrationConsentsAction = safeAction({
  input: z.object({
    email: z.string().email().max(320),
    userId: z.string().uuid().optional().nullable(),
    legalAccepted: z.boolean(),
    communityOptIn: z.boolean().default(false),
  }),
  async run(input) {
    const legal = requireLegalAcceptance(input.legalAccepted);
    if (!legal.ok) return safeFail("VALIDATION", legal.error);

    const ipHash = await clientIpHash();
    const legalRes = await recordLegalAcceptance({
      userId: input.userId,
      email: input.email,
      context: "event_registration",
      ipHash,
    });
    if (!legalRes.ok) return safeFail("CONSENT_FAILED", legalRes.error);

    if (input.communityOptIn) {
      const m = await grantMarketingConsent({
        email: input.email,
        userId: input.userId,
        source: "event_registration",
      });
      if (!m.ok) return safeFail("CONSENT_FAILED", m.error);
    }
    return safeOk({ recorded: true });
  },
});

export const withdrawUnsubscribeAction = safeAction({
  input: z.object({
    token: z.string().trim().min(8).max(2000),
  }),
  async run(input) {
    const limited = rateLimit(`unsub:${input.token.slice(0, 24)}`, 20, 3600);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many attempts. Try again later.");
    const result = await withdrawByToken(input.token);
    if (!result.ok) return safeFail("WITHDRAW_FAILED", result.error);
    return safeOk(result);
  },
});

export const withdrawConsentByIdAction = safeAction({
  input: z.object({ id: z.string().uuid() }),
  auth: () => requireWebsiteCap("community:view"),
  async run(input, admin) {
    const result = await withdrawById(input.id);
    if (!result.ok) return safeFail("WITHDRAW_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "updated",
      reason: "Withdrew marketing consent from Community tab",
    });
    return safeOk({});
  },
});

export const sendCommunityUpdateAction = safeAction({
  input: z.object({
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(3).max(20_000),
    scope: z.enum(["product_updates", "community", "all"]).default("community"),
  }),
  auth: () => requireWebsiteCap("community:view"),
  async run(input, admin) {
    // Sending also requires edit-level trust: owners pass; staff need website:edit or be owner.
    const { canWebsiteCap } = await import("@/src/features/admin/types");
    if (!canWebsiteCap(admin, "website:edit") && !admin.isOwner) {
      return safeFail("FORBIDDEN", "You need website:edit to send community updates.");
    }

    const limited = rateLimit(`community-send:${admin.userId}`, 5, 3600);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many sends. Try again in ${limited.retryAfterSec}s.`);
    }

    const scope = input.scope === "all" ? undefined : input.scope;
    const recipients = await listActiveMarketingConsents({ scope });
    // Dedupe by email
    const byEmail = new Map<string, (typeof recipients)[number]>();
    for (const row of recipients) {
      if (!byEmail.has(row.email)) byEmail.set(row.email, row);
    }
    const unique = [...byEmail.values()];
    const selected = unique.slice(0, COMMUNITY_SEND_CAP);
    const skipped = Math.max(0, unique.length - selected.length);

    let sent = 0;
    for (const row of selected) {
      const unsub = unsubscribeUrlFor(
        row.email,
        (row.scope as "community" | "product_updates") || "community",
      );
      const text = `${input.body}\n\n---\nUnsubscribe: ${unsub}\n`;
      const mail = await sendPlatformEmail({
        lane: "notifications",
        to: row.email,
        subject: input.subject,
        text,
      });
      if (mail.ok) sent += 1;
    }

    await logModeration({
      admin,
      targetType: "website",
      targetId: "marketing_consents",
      targetLabel: "community_update",
      action: "updated",
      reason: "Sent community update",
      extra: { sent, skipped, capped: skipped > 0, total: unique.length, origin: getAppOrigin() },
    });

    return safeOk({ sent, skipped, capped: skipped > 0 });
  },
});

/** After auth signup when user id is known — called from server signup path. */
export async function recordConsentsAfterAuth(opts: {
  email: string;
  userId: string | null;
  role: string;
  legalAccepted: boolean;
  communityOptIn: boolean;
  source: "signup" | "google_signup";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const legal = requireLegalAcceptance(opts.legalAccepted);
  if (!legal.ok) return { ok: false, error: legal.error };
  const ipHash = await clientIpHash();
  const legalRes = await recordLegalAcceptance({
    userId: opts.userId,
    email: opts.email,
    context: `${opts.source}_${opts.role.toLowerCase()}`,
    ipHash,
  });
  if (!legalRes.ok) return { ok: false, error: legalRes.error };
  if (opts.communityOptIn) {
    const m = await grantMarketingConsent({
      email: opts.email,
      userId: opts.userId,
      source: opts.source,
    });
    if (!m.ok) return { ok: false, error: m.error };
  }
  return { ok: true };
}

export async function getCurrentUserIdForConsent(): Promise<string | null> {
  const u = await AuthService.getCurrentUser();
  return u?.userId ?? null;
}
