"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import {
  buildGoogleAuthUrl,
  googleOAuthConfigured,
  revokeOrganizerEmailConnection,
} from "@/src/features/email/organizerEmailConnection.service";
import { testOrganizerConnection } from "@/src/features/email/organizerTransport.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

function revalidateEmailPaths(organizerId: string) {
  revalidatePath(`/organizer/${organizerId}/profile`);
  revalidatePath(`/organizer/${organizerId}/email`);
  revalidatePath(`/admin/organizers/${organizerId}`);
}

async function assertSelfOrOwner(organizerId: string) {
  const user = await AuthService.getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  const isSelf = user.userId === organizerId;
  const admin = await AuthService.requireAdmin("organizers");
  const isOwner = Boolean(admin?.isOwner);
  if (!isSelf && !isOwner) return { ok: false as const, error: "Forbidden." };
  return { ok: true as const, user, isOwner };
}

export const startGoogleConnectAction = safeAction({
  input: z.object({ organizerId: z.string().uuid() }),
  run: async ({ organizerId }) => {
    const gate = await assertSelfOrOwner(organizerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    if (!googleOAuthConfigured()) {
      return safeFail(
        "CONFIG",
        "Google OAuth is not configured on this deployment (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI / EMAIL_CONNECTION_SECRET).",
      );
    }

    const { data: account } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("email, tenant_provisioned")
      .eq("id", organizerId)
      .maybeSingle();

    const accountEmail = account?.email?.trim() || gate.user.email?.trim() || "";
    const requireMatch = Boolean(account?.tenant_provisioned);

    const statePayload: {
      organizerId: string;
      uid: string;
      t: number;
      accountEmail?: string;
      requireMatch?: boolean;
    } = {
      organizerId,
      uid: gate.user.userId,
      t: Date.now(),
    };
    if (requireMatch && accountEmail) {
      statePayload.accountEmail = accountEmail;
      statePayload.requireMatch = true;
    }

    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
    const url = buildGoogleAuthUrl(state, accountEmail || undefined);
    if (!url) return safeFail("CONFIG", "Could not build Google auth URL.");
    return safeOk({ url });
  },
});

const smtpSchema = z.object({
  organizerId: z.string().uuid(),
  fromEmail: z.string().email(),
  fromName: z.string().max(120).optional(),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean().optional(),
  user: z.string().min(1).max(255),
  password: z.string().min(1).max(500),
});

export const saveSmtpConnectionAction = safeAction({
  input: smtpSchema,
  run: async () => safeFail("DEPRECATED", "SMTP is no longer supported. Connect Google instead."),
});

/** SaaS owner provisions SMTP for an organizer who cannot OAuth. */
export const provisionOrganizerSmtpAction = safeAction({
  input: smtpSchema,
  run: async () => safeFail("DEPRECATED", "SMTP is no longer supported. Connect Google instead."),
});

export const revokeEmailConnectionAction = safeAction({
  input: z.object({ organizerId: z.string().uuid() }),
  run: async ({ organizerId }) => {
    const gate = await assertSelfOrOwner(organizerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    await revokeOrganizerEmailConnection(organizerId);
    revalidateEmailPaths(organizerId);
    return safeOk({ revoked: true });
  },
});

export const testEmailConnectionAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
    to: z.string().email().optional(),
  }),
  run: async ({ organizerId, to }) => {
    const gate = await assertSelfOrOwner(organizerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`email:test:${organizerId}`, 5, 300);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many test sends. Retry in ${limited.retryAfterSec}s.`);
    }
    const target = to || gate.user.email;
    if (!target) return safeFail("INVALID", "No test recipient email.");
    const result = await testOrganizerConnection(organizerId, target);
    revalidateEmailPaths(organizerId);
    if (!result.ok)
      return safeFail(result.code || "SEND_FAILED", result.error || "Test send failed.");
    return safeOk({ sent: true, to: target });
  },
});
