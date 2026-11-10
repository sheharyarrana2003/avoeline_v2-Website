"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { startOAuthConnect } from "@/src/features/connections/server/oauth.service";
import {
  disconnectConnection,
  getConnectionById,
  googleConnectionsConfigured,
  listConnections,
  setDefaultSender,
} from "@/src/features/connections/server/connections.service";
import { sendAsConnection } from "@/src/features/connections/server/sender.service";
import { writeConnectionAudit } from "@/src/features/connections/server/audit.service";
import {
  assertCanConnectOwner,
  canManageConnections,
} from "@/src/features/connections/server/assertConnectionsAccess";
import { mintReconnectToken } from "@/src/features/connections/server/reconnectTokens.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { formatConnectionUserError } from "@/src/features/connections/lib/connectionUserErrors";
import {
  createAndCleanupTestCalendarEvent,
  createAndCleanupTestDriveFolder,
  createAndCleanupTestSheet,
  getAvoelineFolderLink,
} from "@/src/features/connections/server/connectionSmoke.service";

function revalidateConnections(ownerType: "user" | "org", ownerId: string) {
  revalidatePath(`/organizer/${ownerId}/settings/connections`);
  revalidatePath(`/organizer/${ownerId}/profile`);
  revalidatePath(`/organizer/${ownerId}/dashboard`);
  revalidatePath(`/organizer/${ownerId}/email`);
  revalidatePath(`/admin/organizers/${ownerId}`);
  revalidatePath(`/vendor/${ownerId}/settings/connections`);
  revalidatePath(`/department/settings/connections`);
  revalidatePath(`/department/clubs/${ownerId}/settings/connections`);
  void ownerType;
}

async function assertSelfOrOwner(ownerId: string) {
  const user = await AuthService.getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  const isSelf = user.userId === ownerId;
  const admin = await AuthService.requireAdmin("organizers");
  const isOwner = Boolean(admin?.isOwner);
  if (!isSelf && !isOwner) return { ok: false as const, error: "Forbidden." };
  return { ok: true as const, user, isOwner };
}

export const startConnectAction = safeAction({
  input: z.object({
    ownerType: z.enum(["user", "org"]).default("user"),
    ownerId: z.string().uuid(),
    capability: z.enum(["email.send", "calendar", "meet", "drive.files", "sheets.sync"]),
    returnTo: z.string().max(500).optional(),
    origin: z.string().url().optional(),
    loginHint: z.string().email().optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
    });
    if (!gate.ok) {
      // Platform owners may connect on behalf of user organizers
      const admin = await AuthService.requireAdmin("organizers");
      if (!(admin?.isOwner && input.ownerType === "user")) {
        return safeFail("FORBIDDEN", gate.error);
      }
    }
    if (!googleConnectionsConfigured()) {
      return safeFail("CONFIG", formatConnectionUserError("CONFIG"));
    }
    const origin =
      input.origin ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const returnTo =
      input.returnTo ||
      (input.ownerType === "org"
        ? `/department/settings/connections`
        : `/organizer/${input.ownerId}/settings/connections`);
    const started = await startOAuthConnect({
      userId: user.userId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      capability: input.capability,
      returnTo,
      origin,
      loginHint: input.loginHint,
    });
    if (!started.ok) return safeFail(started.code || "OAUTH", started.error);
    return safeOk({ url: started.url });
  },
});

export const disconnectConnectionAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
  }),
  run: async ({ connectionId }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", "Connection not found.");
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) {
      const admin = await AuthService.requireAdmin("organizers");
      if (!admin?.isOwner) return safeFail("FORBIDDEN", gate.error);
    }
    await disconnectConnection({ connectionId, actorId: user.userId });
    revalidateConnections(conn.ownerType, conn.ownerId);
    return safeOk({ revoked: true });
  },
});

export const testConnectionAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    to: z.string().email().optional(),
  }),
  run: async ({ connectionId, to }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", "Connection not found.");
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`connections:test:${connectionId}`, 5, 300);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many test sends. Retry in ${limited.retryAfterSec}s.`);
    }
    const target = to || user.email;
    if (!target) return safeFail("INVALID", "No test recipient email.");
    const result = await sendAsConnection(
      {
        connectionId,
        to: target,
        subject: "Avoeline connection test",
        text: "Your Google connection works. You can send event mail from this account.",
        html: "<p>Your Google connection works. You can send event mail from this account.</p>",
        kind: "custom",
      },
      user.userId,
    );
    revalidateConnections(conn.ownerType, conn.ownerId);
    if (!result.ok) {
      return safeFail(
        result.code || "SEND_FAILED",
        formatConnectionUserError(result.code || result.error, "Test send failed."),
      );
    }
    return safeOk({ sent: true, to: target });
  },
});

export const createTestCalendarEventAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
  }),
  run: async ({ connectionId }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", formatConnectionUserError("NOT_FOUND"));
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`connections:test-cal:${connectionId}`, 5, 300);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", formatConnectionUserError("RATE_LIMIT"));
    }
    const r = await createAndCleanupTestCalendarEvent({
      actorId: user.userId,
      connectionId,
      withMeet: false,
    });
    if (!r.ok) return safeFail(r.code, formatConnectionUserError(r.code, r.error));
    return safeOk(r);
  },
});

export const createTestMeetLinkAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
  }),
  run: async ({ connectionId }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", formatConnectionUserError("NOT_FOUND"));
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`connections:test-meet:${connectionId}`, 5, 300);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", formatConnectionUserError("RATE_LIMIT"));
    }
    const r = await createAndCleanupTestCalendarEvent({
      actorId: user.userId,
      connectionId,
      withMeet: true,
    });
    if (!r.ok) return safeFail(r.code, formatConnectionUserError(r.code, r.error));
    return safeOk(r);
  },
});

export const createTestDriveFolderAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
  }),
  run: async ({ connectionId }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", formatConnectionUserError("NOT_FOUND"));
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`connections:test-folder:${connectionId}`, 5, 300);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", formatConnectionUserError("RATE_LIMIT"));
    }
    const r = await createAndCleanupTestDriveFolder({
      actorId: user.userId,
      connectionId,
    });
    if (!r.ok) return safeFail(r.code, formatConnectionUserError(r.code, r.error));
    return safeOk(r);
  },
});

export const createTestSheetAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
  }),
  run: async ({ connectionId }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", formatConnectionUserError("NOT_FOUND"));
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`connections:test-sheet:${connectionId}`, 5, 300);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", formatConnectionUserError("RATE_LIMIT"));
    }
    const r = await createAndCleanupTestSheet({
      actorId: user.userId,
      connectionId,
    });
    if (!r.ok) return safeFail(r.code, formatConnectionUserError(r.code, r.error));
    return safeOk(r);
  },
});

export const openAvoelineFolderAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
  }),
  run: async ({ connectionId }) => {
    const conn = await getConnectionById(connectionId);
    if (!conn) return safeFail("NOT_FOUND", formatConnectionUserError("NOT_FOUND"));
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const gate = await assertCanConnectOwner({
      user,
      ownerType: conn.ownerType,
      ownerId: conn.ownerId,
    });
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const r = await getAvoelineFolderLink({
      actorId: user.userId,
      connectionId,
    });
    if (!r.ok) return safeFail(r.code, formatConnectionUserError(r.code, r.error));
    return safeOk(r);
  },
});

export const setDefaultSenderAction = safeAction({
  input: z.object({
    ownerType: z.enum(["user", "org"]).default("user"),
    ownerId: z.string().uuid(),
    connectionId: z.string().uuid(),
    eventId: z.string().uuid().optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    if (input.ownerType === "user" && user.userId !== input.ownerId) {
      const admin = await AuthService.requireAdmin("organizers");
      if (!admin?.isOwner) return safeFail("FORBIDDEN", "Forbidden.");
    }
    if (input.ownerType === "org") {
      if (!(await canManageConnections(user, input.ownerId))) {
        return safeFail("FORBIDDEN", "Forbidden.");
      }
    }
    const conn = await getConnectionById(input.connectionId);
    if (!conn) return safeFail("NOT_FOUND", "Connection not found.");
    await setDefaultSender({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      connectionId: input.connectionId,
      eventId: input.eventId,
    });
    revalidateConnections(input.ownerType, input.ownerId);
    return safeOk({ saved: true });
  },
});

export const dismissConnectionsChecklistAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
  }),
  run: async ({ organizerId }) => {
    const gate = await assertSelfOrOwner(organizerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const { data: user } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("extra")
      .eq("id", organizerId)
      .maybeSingle();
    const extra =
      user?.extra && typeof user.extra === "object" && !Array.isArray(user.extra)
        ? (user.extra as Record<string, unknown>)
        : {};
    const next = {
      ...extra,
      connections_checklist_dismissed_at: new Date().toISOString(),
    };
    await supabaseAdmin
      .from(TABLES.USERS)
      .update({ extra: next as unknown as import("@/src/lib/database.types").Json })
      .eq("id", organizerId);
    revalidatePath(`/organizer/${organizerId}/dashboard`);
    return safeOk({ dismissed: true });
  },
});

export const createReconnectLinkAction = safeAction({
  input: z.object({
    ownerType: z.enum(["user", "org"]).default("user"),
    ownerId: z.string().uuid(),
    /** @deprecated use ownerId */
    organizerId: z.string().uuid().optional(),
    connectionId: z.string().uuid().optional(),
    returnPath: z.string().max(500).optional(),
  }),
  run: async (input) => {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin) return safeFail("FORBIDDEN", "Admin only.");
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");

    const ownerId = input.ownerId || input.organizerId;
    if (!ownerId) return safeFail("INVALID", "ownerId required.");
    const ownerType = input.ownerType;

    const minted = await mintReconnectToken({
      ownerType,
      ownerId,
      connectionId: input.connectionId,
      createdBy: user.userId,
    });
    const base =
      input.returnPath ||
      (ownerType === "org"
        ? `/department/settings/connections`
        : `/organizer/${ownerId}/settings/connections`);
    const sep = base.includes("?") ? "&" : "?";
    const path = `${base}${sep}reconnect=1&t=${minted.token}`;
    return safeOk({ path, expiresAt: minted.expiresAt });
  },
});

export const setTenantKillSwitchAction = safeAction({
  input: z.object({
    mode: z.enum(["org_flag", "disable_user_connections"]),
    orgId: z.string().uuid().optional(),
    organizerId: z.string().uuid().optional(),
    disabled: z.boolean(),
    reason: z.string().min(3).max(500),
  }),
  run: async (input) => {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin) return safeFail("FORBIDDEN", "Admin only.");
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");

    if (input.mode === "org_flag") {
      if (!input.orgId) return safeFail("INVALID", "orgId required.");
      await supabaseAdmin
        .from(TABLES.ORGANIZATIONS)
        .update({
          connections_google_disabled: input.disabled,
          connections_google_disabled_reason: input.disabled ? input.reason.slice(0, 500) : null,
        })
        .eq("id", input.orgId);
      await writeConnectionAudit({
        ownerType: "org",
        ownerId: input.orgId,
        actorId: user.userId,
        action: input.disabled ? "kill_switch" : "kill_switch_cleared",
        details: { reason: input.reason },
      });
      revalidatePath(`/admin/departments/${input.orgId}`);
      return safeOk({ saved: true });
    }

    if (!input.organizerId) return safeFail("INVALID", "organizerId required.");
    if (input.disabled) {
      await supabaseAdmin
        .from(TABLES.INTEGRATION_CONNECTIONS)
        .update({
          status: "disabled",
          last_error: input.reason.slice(0, 500),
          last_error_at: new Date().toISOString(),
        })
        .eq("owner_type", "user")
        .eq("owner_id", input.organizerId)
        .eq("status", "active");
    } else {
      await supabaseAdmin
        .from(TABLES.INTEGRATION_CONNECTIONS)
        .update({
          status: "needs_reconnect",
          last_error: "Re-enable: reconnect Google.",
          last_error_at: new Date().toISOString(),
        })
        .eq("owner_type", "user")
        .eq("owner_id", input.organizerId)
        .eq("status", "disabled");
    }
    await writeConnectionAudit({
      ownerType: "user",
      ownerId: input.organizerId,
      actorId: user.userId,
      action: input.disabled ? "kill_switch" : "kill_switch_cleared",
      details: { reason: input.reason },
    });
    revalidatePath(`/admin/organizers/${input.organizerId}`);
    return safeOk({ saved: true });
  },
});

export async function loadOwnerConnections(ownerId: string) {
  return listConnections({ ownerType: "user", ownerId, includeQuota: true });
}
