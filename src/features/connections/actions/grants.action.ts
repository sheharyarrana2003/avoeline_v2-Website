"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { canManageConnections } from "@/src/features/connections/server/assertConnectionsAccess";
import { getConnectionById } from "@/src/features/connections/server/connections.service";
import {
  grantUse,
  listEligibleMembers,
  listGrants,
  revokeUse,
} from "@/src/features/connections/server/grants.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

function revalidateOrgConnections(orgId: string) {
  revalidatePath(`/department/settings/connections`);
  revalidatePath(`/department/clubs/${orgId}/settings/connections`);
}

export const listGrantsAction = safeAction({
  input: z.object({ connectionId: z.string().uuid() }),
  run: async ({ connectionId }) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const conn = await getConnectionById(connectionId);
    if (!conn || conn.ownerType !== "org") return safeFail("NOT_FOUND", "Not found.");
    if (!(await canManageConnections(user, conn.ownerId))) {
      return safeFail("FORBIDDEN", "Forbidden.");
    }
    const grants = await listGrants(connectionId);
    return safeOk({ grants });
  },
});

export const listEligibleMembersAction = safeAction({
  input: z.object({ orgId: z.string().uuid() }),
  run: async ({ orgId }) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    if (!(await canManageConnections(user, orgId))) {
      return safeFail("FORBIDDEN", "Forbidden.");
    }
    const members = await listEligibleMembers(orgId);
    return safeOk({ members });
  },
});

export const grantUseAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    userId: z.string().uuid(),
    capabilities: z
      .array(z.enum(["email.send", "calendar", "meet", "drive.files", "sheets.sync"]))
      .min(1),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const conn = await getConnectionById(input.connectionId);
    if (!conn || conn.ownerType !== "org") return safeFail("NOT_FOUND", "Not found.");
    if (!(await canManageConnections(user, conn.ownerId))) {
      return safeFail("FORBIDDEN", "Forbidden.");
    }
    const result = await grantUse({
      connectionId: input.connectionId,
      userId: input.userId,
      capabilities: input.capabilities,
      grantedBy: user.userId,
    });
    if (!result.ok) return safeFail("GRANT", result.error);
    revalidateOrgConnections(conn.ownerId);
    return safeOk({ grantId: result.grantId });
  },
});

export const revokeUseAction = safeAction({
  input: z.object({ grantId: z.string().uuid() }),
  run: async ({ grantId }) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const { TABLES } = await import("@/data/collections");
    const { supabaseAdmin } = await import("@/data/supabase");
    const { data: grant } = await supabaseAdmin
      .from(TABLES.CONNECTION_GRANTS)
      .select("connection_id")
      .eq("id", grantId)
      .maybeSingle();
    if (!grant) return safeFail("NOT_FOUND", "Grant not found.");
    const conn = await getConnectionById(grant.connection_id);
    if (!conn || !(await canManageConnections(user, conn.ownerId))) {
      return safeFail("FORBIDDEN", "Forbidden.");
    }
    const result = await revokeUse({ grantId, actorId: user.userId });
    if (!result.ok) return safeFail("REVOKE", result.error);
    revalidateOrgConnections(conn.ownerId);
    return safeOk({ revoked: true });
  },
});
