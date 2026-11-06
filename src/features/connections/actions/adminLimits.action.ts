"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { writeConnectionAudit } from "@/src/features/connections/server/audit.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

export const upsertEmailLimitOverrideAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    dailyCap: z.number().int().positive().optional(),
    monthlyCap: z.number().int().positive().optional(),
    maxPerSend: z.number().int().positive().max(5000).optional(),
    reason: z.string().min(3).max(500),
    expiresAt: z.string().datetime().optional(),
  }),
  run: async (input) => {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin) return safeFail("FORBIDDEN", "Admin only.");
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");

    await supabaseAdmin.from(TABLES.EMAIL_LIMIT_OVERRIDES).upsert({
      owner_id: input.ownerId,
      daily_cap: input.dailyCap ?? null,
      monthly_cap: input.monthlyCap ?? null,
      max_per_send: input.maxPerSend ?? null,
      reason: input.reason,
      set_by: user.userId,
      expires_at: input.expiresAt ?? null,
      updated_at: new Date().toISOString(),
    });

    await writeConnectionAudit({
      ownerType: "user",
      ownerId: input.ownerId,
      actorId: user.userId,
      action: "email_limit_override",
      details: {
        dailyCap: input.dailyCap,
        monthlyCap: input.monthlyCap,
        maxPerSend: input.maxPerSend,
        reason: input.reason,
      },
    });

    revalidatePath(`/admin/organizers/${input.ownerId}`);
    return safeOk({ saved: true });
  },
});

export const pauseOrganizerSendingAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    reason: z.string().min(3).max(500),
    until: z.string().datetime().optional(),
  }),
  run: async (input) => {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin) return safeFail("FORBIDDEN", "Admin only.");
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");

    const until = input.until || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from(TABLES.INTEGRATION_CONNECTIONS)
      .update({
        sending_paused_until: until,
        sending_paused_reason: input.reason.slice(0, 500),
      })
      .eq("owner_type", "user")
      .eq("owner_id", input.ownerId)
      .neq("status", "revoked");

    await writeConnectionAudit({
      ownerType: "user",
      ownerId: input.ownerId,
      actorId: user.userId,
      action: "sending_paused",
      details: { reason: input.reason, until },
    });

    try {
      const { createPlatformAlert } = await import("@/src/features/admin/platformAlerts.service");
      await createPlatformAlert({
        kind: "email_sending_paused",
        targetUserId: input.ownerId,
        title: "Outbound email paused",
        body: input.reason,
      });
    } catch {
      // optional
    }

    revalidatePath(`/admin/organizers/${input.ownerId}`);
    return safeOk({ pausedUntil: until });
  },
});

export const getOrganizerEmailUsageAction = safeAction({
  input: z.object({ ownerId: z.string().uuid() }),
  run: async ({ ownerId }) => {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin) return safeFail("FORBIDDEN", "Admin only.");

    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: conns } = await supabaseAdmin
      .from(TABLES.INTEGRATION_CONNECTIONS)
      .select("id, provider_email, status, quota_exhausted_until, sending_paused_until")
      .eq("owner_type", "user")
      .eq("owner_id", ownerId);

    const ids = (conns || []).map((c) => c.id);
    let sent24 = 0;
    if (ids.length) {
      const { count } = await supabaseAdmin
        .from(TABLES.EMAIL_LOG)
        .select("id", { count: "exact", head: true })
        .in("connection_id", ids)
        .eq("status", "sent")
        .gte("sent_at", since24);
      sent24 = count ?? 0;
    }

    return safeOk({
      connections: conns || [],
      sentLast24h: sent24,
    });
  },
});
