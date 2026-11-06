import "server-only";

import type { CurrentUserData } from "@/src/services/models/user.type";
import { canLeadClub, canManageOrg } from "@/src/features/department/orgScope";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { ConnectionCapability, ConnectionOwnerType } from "../types";
import { getConnectionById } from "./connections.service";

/** docs/17 connections:manage — dept admin or club lead. */
export async function canManageConnections(
  user: CurrentUserData | null,
  orgId: string,
): Promise<boolean> {
  if (!user?.userId || !orgId) return false;
  const { data: org } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id, org_type")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return false;
  if (org.org_type === "club") return canLeadClub(user, orgId);
  return canManageOrg(user, orgId);
}

export async function assertMayUseConnection(opts: {
  userId: string;
  connectionId: string;
  capability: ConnectionCapability;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const conn = await getConnectionById(opts.connectionId);
  if (!conn) return { ok: false, error: "Connection not found." };
  if (conn.status !== "active") {
    return { ok: false, error: `Connection is ${conn.status}.` };
  }
  const hasCap = conn.capabilities.some((c) => c.capability === opts.capability && c.enabled);
  if (!hasCap) return { ok: false, error: "Capability not enabled on this connection." };

  if (conn.ownerType === "user" && conn.ownerId === opts.userId) {
    return { ok: true };
  }

  if (conn.ownerType === "org") {
    const { data: grant } = await supabaseAdmin
      .from(TABLES.CONNECTION_GRANTS)
      .select("id, capabilities")
      .eq("connection_id", opts.connectionId)
      .eq("user_id", opts.userId)
      .is("revoked_at", null)
      .maybeSingle();
    if (grant && (grant.capabilities || []).includes(opts.capability)) {
      return { ok: true };
    }
    return { ok: false, error: "No active grant for this organization connection." };
  }

  return { ok: false, error: "You cannot use this connection." };
}

export async function assertCanConnectOwner(opts: {
  user: CurrentUserData;
  ownerType: ConnectionOwnerType;
  ownerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (opts.ownerType === "user") {
    if (opts.user.userId === opts.ownerId) return { ok: true };
    return { ok: false, error: "You can only connect your own account." };
  }
  const allowed = await canManageConnections(opts.user, opts.ownerId);
  if (!allowed) {
    return { ok: false, error: "You need connections:manage on this organization." };
  }
  return { ok: true };
}
