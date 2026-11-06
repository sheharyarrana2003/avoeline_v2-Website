import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { writeConnectionAudit } from "./audit.service";
import { getConnectionById } from "./connections.service";
import type { ConnectionCapability } from "../types";

export type GrantRow = {
  id: string;
  connectionId: string;
  userId: string;
  capabilities: ConnectionCapability[];
  grantedBy: string | null;
  createdAt: string;
  revokedAt: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

export async function listGrants(connectionId: string): Promise<GrantRow[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .select("id, connection_id, user_id, capabilities, granted_by, created_at, revoked_at")
    .eq("connection_id", connectionId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (!data?.length) return [];

  const userIds = [...new Set(data.map((g) => g.user_id))];
  const { data: users } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, email, full_name")
    .in("id", userIds);
  const byId = new Map((users || []).map((u) => [u.id, u]));

  return data.map((g) => ({
    id: g.id,
    connectionId: g.connection_id,
    userId: g.user_id,
    capabilities: (g.capabilities || []) as ConnectionCapability[],
    grantedBy: g.granted_by,
    createdAt: g.created_at,
    revokedAt: g.revoked_at,
    userName: byId.get(g.user_id)?.full_name ?? null,
    userEmail: byId.get(g.user_id)?.email ?? null,
  }));
}

export async function listEligibleMembers(
  orgId: string,
): Promise<Array<{ userId: string; name: string; email: string }>> {
  const { data: memberships } = await supabaseAdmin
    .from(TABLES.ORG_MEMBERSHIPS)
    .select("user_id")
    .eq("org_id", orgId);
  const ids = [...new Set((memberships || []).map((m) => m.user_id).filter(Boolean))];
  if (!ids.length) return [];
  const { data: users } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, email, full_name")
    .in("id", ids);
  return (users || []).map((u) => ({
    userId: u.id,
    name: u.full_name || "",
    email: u.email || "",
  }));
}

export async function grantUse(opts: {
  connectionId: string;
  userId: string;
  capabilities: ConnectionCapability[];
  grantedBy: string;
}): Promise<{ ok: true; grantId: string } | { ok: false; error: string }> {
  const conn = await getConnectionById(opts.connectionId);
  if (!conn) return { ok: false, error: "Connection not found." };
  if (conn.ownerType !== "org") {
    return { ok: false, error: "Grants only apply to organization connections." };
  }
  if (!opts.capabilities.length) return { ok: false, error: "Pick at least one capability." };

  // Revoke any prior active grant for this pair, then insert
  await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .update({ revoked_at: new Date().toISOString() })
    .eq("connection_id", opts.connectionId)
    .eq("user_id", opts.userId)
    .is("revoked_at", null);

  const { data, error } = await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .insert({
      connection_id: opts.connectionId,
      user_id: opts.userId,
      capabilities: opts.capabilities,
      granted_by: opts.grantedBy,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message || "Could not grant." };

  await writeConnectionAudit({
    connectionId: opts.connectionId,
    ownerType: "org",
    ownerId: conn.ownerId,
    actorId: opts.grantedBy,
    action: "grant",
    details: { userId: opts.userId, capabilities: opts.capabilities },
  });

  return { ok: true, grantId: data.id };
}

export async function revokeUse(opts: {
  grantId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: grant } = await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .select("id, connection_id, user_id, revoked_at")
    .eq("id", opts.grantId)
    .maybeSingle();
  if (!grant) return { ok: false, error: "Grant not found." };
  if (grant.revoked_at) return { ok: true };

  await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", opts.grantId);

  const conn = await getConnectionById(grant.connection_id);
  await writeConnectionAudit({
    connectionId: grant.connection_id,
    ownerType: conn?.ownerType || "org",
    ownerId: conn?.ownerId || grant.user_id,
    actorId: opts.actorId,
    action: "revoke",
    details: { userId: grant.user_id, grantId: opts.grantId },
  });

  return { ok: true };
}

/** When the connecting user leaves the org: needs_reconnect + owner_changed. */
export async function markOwnerLeftForUser(opts: {
  orgId: string;
  userId: string;
  actorId?: string | null;
}): Promise<number> {
  const { data: rows } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("owner_type", "org")
    .eq("owner_id", opts.orgId)
    .eq("connected_by", opts.userId)
    .neq("status", "revoked");

  let n = 0;
  for (const row of rows || []) {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from(TABLES.INTEGRATION_CONNECTIONS)
      .update({
        status: "needs_reconnect",
        last_error: "owner_changed",
        last_error_at: now,
      })
      .eq("id", row.id);
    await writeConnectionAudit({
      connectionId: row.id,
      ownerType: "org",
      ownerId: opts.orgId,
      actorId: opts.actorId ?? null,
      action: "owner_left",
      details: { previousConnectedBy: opts.userId },
    });
    n += 1;
  }
  return n;
}

export async function findOrgConnectionsWithGrant(opts: {
  orgId: string;
  userId: string;
  capability: ConnectionCapability;
}): Promise<string | null> {
  const { data: conns } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("owner_type", "org")
    .eq("owner_id", opts.orgId)
    .eq("status", "active");
  if (!conns?.length) return null;

  const ids = conns.map((c) => c.id);
  const { data: grants } = await supabaseAdmin
    .from(TABLES.CONNECTION_GRANTS)
    .select("connection_id, capabilities")
    .in("connection_id", ids)
    .eq("user_id", opts.userId)
    .is("revoked_at", null);

  for (const g of grants || []) {
    if ((g.capabilities || []).includes(opts.capability)) {
      return g.connection_id;
    }
  }
  return null;
}
