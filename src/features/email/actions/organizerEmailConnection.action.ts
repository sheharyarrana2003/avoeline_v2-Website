"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import {
  disconnectConnectionAction,
  startConnectAction,
  testConnectionAction,
} from "@/src/features/connections/actions/connections.action";
import { findActiveEmailConnection } from "@/src/features/connections/server/connections.service";
import { googleOAuthConfigured } from "@/src/features/email/organizerEmailConnection.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

function revalidateEmailPaths(organizerId: string) {
  revalidatePath(`/organizer/${organizerId}/profile`);
  revalidatePath(`/organizer/${organizerId}/email`);
  revalidatePath(`/organizer/${organizerId}/settings/connections`);
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
    if (!googleOAuthConfigured()) {
      return safeFail("CONFIG", "Google OAuth is not configured on this deployment.");
    }
    return startConnectAction({
      ownerId: organizerId,
      ownerType: "user",
      capability: "email.send",
      returnTo: `/organizer/${organizerId}/settings/connections`,
    });
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

export const provisionOrganizerSmtpAction = safeAction({
  input: smtpSchema,
  run: async () => safeFail("DEPRECATED", "SMTP is no longer supported. Connect Google instead."),
});

export const revokeEmailConnectionAction = safeAction({
  input: z.object({ organizerId: z.string().uuid() }),
  run: async ({ organizerId }) => {
    const gate = await assertSelfOrOwner(organizerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const active = await findActiveEmailConnection({
      ownerType: "user",
      ownerId: organizerId,
    });
    if (active) {
      await disconnectConnectionAction({ connectionId: active.id });
    }
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
    const active = await findActiveEmailConnection({
      ownerType: "user",
      ownerId: organizerId,
    });
    if (!active) return safeFail("NO_CONNECTION", "Connect Google first.");
    const result = await testConnectionAction({ connectionId: active.id, to });
    revalidateEmailPaths(organizerId);
    return result;
  },
});
