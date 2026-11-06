import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getGoogleOAuthConfig, isConnectionsGoogleEnabled } from "@/src/env";
import { GoogleOAuthProvider } from "../providers/google/oauth";
import {
  clearAccessTokenCache,
  connectionsEncryptionConfigured,
  CURRENT_KEY_VERSION,
  decryptToken,
  encryptToken,
  getCachedAccessToken,
  cacheAccessToken,
} from "./tokens.service";
import { writeConnectionAudit } from "./audit.service";
import { remainingDailyQuota } from "./quota.service";
import type {
  ConnectionCapability,
  ConnectionOwnerType,
  ConnectionPublic,
  ConnectionStatus,
} from "../types";

const CONN_COLS =
  "id, owner_type, owner_id, provider, provider_account_id, provider_email, display_name, avatar_url, status, granted_scopes, connected_at, last_used_at, last_error, daily_limit, per_minute_limit, is_workspace, quota_exhausted_until, sending_paused_until, sending_paused_reason";

type ConnRow = {
  id: string;
  owner_type: string;
  owner_id: string;
  provider: string;
  provider_account_id: string;
  provider_email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  granted_scopes: string[] | null;
  connected_at: string;
  last_used_at: string | null;
  last_error: string | null;
  daily_limit?: number | null;
  per_minute_limit?: number | null;
  is_workspace?: boolean | null;
  quota_exhausted_until?: string | null;
  sending_paused_until?: string | null;
  sending_paused_reason?: string | null;
};

type CapRow = {
  connection_id: string;
  capability: string;
  enabled: boolean;
  settings: Record<string, unknown> | null;
};

function toPublic(row: ConnRow, caps: CapRow[], quotaRemaining?: number | null): ConnectionPublic {
  return {
    id: row.id,
    ownerType: row.owner_type as ConnectionOwnerType,
    ownerId: row.owner_id,
    provider: row.provider as ConnectionPublic["provider"],
    providerAccountId: row.provider_account_id,
    providerEmail: row.provider_email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    status: row.status as ConnectionStatus,
    grantedScopes: row.granted_scopes || [],
    connectedAt: row.connected_at,
    lastUsedAt: row.last_used_at,
    lastError: row.last_error,
    dailyLimit: row.daily_limit ?? 400,
    perMinuteLimit: row.per_minute_limit ?? 30,
    isWorkspace: Boolean(row.is_workspace),
    quotaExhaustedUntil: row.quota_exhausted_until ?? null,
    sendingPausedUntil: row.sending_paused_until ?? null,
    capabilities: caps
      .filter((c) => c.connection_id === row.id)
      .map((c) => ({
        capability: c.capability as ConnectionCapability,
        enabled: c.enabled,
        settings: (c.settings || {}) as Record<string, unknown>,
      })),
    quotaRemaining: quotaRemaining ?? null,
  };
}

export function googleConnectionsConfigured(): boolean {
  const oauth = getGoogleOAuthConfig();
  return Boolean(
    oauth.clientId && oauth.clientSecret && oauth.redirectUri && connectionsEncryptionConfigured(),
  );
}

export async function assertGoogleNotKilled(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  actorId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isConnectionsGoogleEnabled()) {
    await writeConnectionAudit({
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      actorId: opts.actorId,
      action: "kill_switch_global",
      details: { provider: "google" },
    });
    return { ok: false, error: "Google connections are disabled on this platform." };
  }
  // Per-tenant: organizations.connections_google_disabled when owner is org,
  // or when user's primary org has the flag (C1: check orgs owned by user).
  const { data: orgs } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id, connections_google_disabled, connections_google_disabled_reason")
    .or(opts.ownerType === "org" ? `id.eq.${opts.ownerId}` : `owner_user_id.eq.${opts.ownerId}`)
    .eq("connections_google_disabled", true)
    .limit(1);
  if (orgs?.[0]?.connections_google_disabled) {
    await writeConnectionAudit({
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      actorId: opts.actorId,
      action: "kill_switch_tenant",
      details: {
        orgId: orgs[0].id,
        reason: orgs[0].connections_google_disabled_reason,
      },
    });
    return {
      ok: false,
      error:
        orgs[0].connections_google_disabled_reason ||
        "Google connections are disabled for this organization.",
    };
  }
  return { ok: true };
}

export async function listConnections(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  includeQuota?: boolean;
}): Promise<ConnectionPublic[]> {
  const { data: rows, error } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select(CONN_COLS)
    .eq("owner_type", opts.ownerType)
    .eq("owner_id", opts.ownerId)
    .neq("status", "revoked")
    .order("connected_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id);
  const { data: caps } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("connection_id, capability, enabled, settings")
    .in("connection_id", ids);

  const result: ConnectionPublic[] = [];
  for (const row of rows as ConnRow[]) {
    let quota: number | null = null;
    if (opts.includeQuota && row.status === "active") {
      quota = await remainingDailyQuota(row.id, "email.send").catch(() => null);
    }
    result.push(toPublic(row, (caps || []) as CapRow[], quota));
  }
  return result;
}

export async function getConnectionById(connectionId: string): Promise<ConnectionPublic | null> {
  const { data: row, error } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select(CONN_COLS)
    .eq("id", connectionId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: caps } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CAPABILITIES)
    .select("connection_id, capability, enabled, settings")
    .eq("connection_id", connectionId);
  return toPublic(row as ConnRow, (caps || []) as CapRow[]);
}

export async function findActiveEmailConnection(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
}): Promise<ConnectionPublic | null> {
  const list = await listConnections({ ...opts, includeQuota: false });
  return (
    list.find(
      (c) =>
        c.status === "active" &&
        c.capabilities.some((cap) => cap.capability === "email.send" && cap.enabled),
    ) || null
  );
}

export async function upsertGoogleConnection(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  providerAccountId: string;
  providerEmail: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  grantedScopes: string[];
  refreshToken: string;
  connectedBy: string;
  capabilities: ConnectionCapability[];
  isWorkspace?: boolean;
}): Promise<ConnectionPublic> {
  const now = new Date().toISOString();
  const isWorkspace = Boolean(opts.isWorkspace);
  const dailyLimit = isWorkspace ? 1500 : 400;
  const { data: row, error } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .upsert(
      {
        owner_type: opts.ownerType,
        owner_id: opts.ownerId,
        provider: "google",
        provider_account_id: opts.providerAccountId,
        provider_email: opts.providerEmail,
        display_name: opts.displayName ?? null,
        avatar_url: opts.avatarUrl ?? null,
        status: "active",
        granted_scopes: opts.grantedScopes,
        connected_by: opts.connectedBy,
        connected_at: now,
        last_error: null,
        last_error_at: null,
        is_workspace: isWorkspace,
        daily_limit: dailyLimit,
        per_minute_limit: 30,
        quota_exhausted_until: null,
      },
      { onConflict: "owner_type,owner_id,provider,provider_account_id" },
    )
    .select(CONN_COLS)
    .single();
  if (error || !row) throw error || new Error("Failed to upsert connection");

  await supabaseAdmin.from(TABLES.INTEGRATION_SECRETS).upsert({
    connection_id: row.id,
    encrypted_refresh_token: encryptToken(opts.refreshToken),
    key_version: CURRENT_KEY_VERSION,
  });

  for (const capability of opts.capabilities) {
    await supabaseAdmin.from(TABLES.INTEGRATION_CAPABILITIES).upsert({
      connection_id: row.id,
      capability,
      enabled: true,
      settings:
        capability === "email.send"
          ? {
              daily_limit: dailyLimit,
              per_minute_limit: 30,
              from_email: opts.providerEmail,
            }
          : {},
    });
  }

  await writeConnectionAudit({
    connectionId: row.id,
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    actorId: opts.connectedBy,
    action: "connect",
    details: { provider: "google", capabilities: opts.capabilities },
  });

  return getConnectionById(row.id) as Promise<ConnectionPublic>;
}

/** Rate-limited reconnect alert (in-app + platform email channels via notifications). */
export async function notifyConnectionNeedsReconnect(connectionId: string): Promise<void> {
  const { rateLimit } = await import("@/src/lib/rateLimit");
  const limited = rateLimit(`reconnect-notify:${connectionId}`, 1, 86_400);
  if (!limited.ok) return;

  const { data: row } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id, owner_type, owner_id, connected_by, provider_email")
    .eq("id", connectionId)
    .maybeSingle();
  if (!row) return;

  const notifyUserId =
    row.owner_type === "user"
      ? String(row.owner_id)
      : row.connected_by
        ? String(row.connected_by)
        : "";
  if (!notifyUserId) return;

  const reconnectPath =
    row.owner_type === "user"
      ? `/organizer/${row.owner_id}/settings/connections`
      : `/organizer/settings/connections`;

  try {
    const { absoluteUrl } = await import("@/src/lib/appUrl");
    const { sendNotification } = await import("@/src/lib/notifications");
    const reconnectUrl = await absoluteUrl(reconnectPath).catch(() => reconnectPath);
    await sendNotification(notifyUserId, "connection_needs_reconnect", {
      providerEmail: String(row.provider_email || "Google"),
      reconnectUrl,
      subject: `Reconnect Google: ${row.provider_email || "account"}`,
      body: `Your Google connection needs to be reconnected: ${reconnectUrl}`,
    });
  } catch (err) {
    console.warn("[notifyConnectionNeedsReconnect]", connectionId, err);
  }
}

export async function markNeedsReconnect(
  connectionId: string,
  errorMessage: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .update({
      status: "needs_reconnect",
      last_error: errorMessage.slice(0, 500),
      last_error_at: now,
    })
    .eq("id", connectionId);

  await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .update({ paused: true, status: "paused" })
    .eq("connection_id", connectionId)
    .in("status", ["queued", "sending"]);

  clearAccessTokenCache(connectionId);
  await notifyConnectionNeedsReconnect(connectionId);
}

export async function markBlockedByAdmin(connectionId: string, message: string): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .update({
      status: "blocked_by_admin",
      last_error: message.slice(0, 500),
      last_error_at: now,
    })
    .eq("id", connectionId);
  clearAccessTokenCache(connectionId);
}

export async function disconnectConnection(opts: {
  connectionId: string;
  actorId: string;
}): Promise<void> {
  const conn = await getConnectionById(opts.connectionId);
  if (!conn) return;

  const { data: secret } = await supabaseAdmin
    .from(TABLES.INTEGRATION_SECRETS)
    .select("encrypted_refresh_token")
    .eq("connection_id", opts.connectionId)
    .maybeSingle();

  if (secret?.encrypted_refresh_token) {
    try {
      const refresh = decryptToken(secret.encrypted_refresh_token);
      const oauth = getGoogleOAuthConfig();
      if (oauth.clientId) {
        await GoogleOAuthProvider.revokeToken(refresh, oauth.clientId);
      }
    } catch {
      // still delete local secret
    }
  }

  await supabaseAdmin
    .from(TABLES.INTEGRATION_SECRETS)
    .delete()
    .eq("connection_id", opts.connectionId);

  await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .update({
      status: "revoked",
      last_error: null,
      last_error_at: null,
    })
    .eq("id", opts.connectionId);

  await supabaseAdmin
    .from(TABLES.EMAIL_OUTBOX)
    .update({ paused: true, status: "paused" })
    .eq("connection_id", opts.connectionId)
    .in("status", ["queued", "sending"]);

  clearAccessTokenCache(opts.connectionId);

  await writeConnectionAudit({
    connectionId: opts.connectionId,
    ownerType: conn.ownerType,
    ownerId: conn.ownerId,
    actorId: opts.actorId,
    action: "disconnect",
    details: { provider: conn.provider },
  });
}

export async function getAccessTokenForConnection(connectionId: string): Promise<string> {
  const cached = getCachedAccessToken(connectionId);
  if (cached) return cached;

  const oauth = getGoogleOAuthConfig();
  if (!oauth.clientId || !oauth.clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const { data: secret, error } = await supabaseAdmin
    .from(TABLES.INTEGRATION_SECRETS)
    .select("encrypted_refresh_token")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error || !secret?.encrypted_refresh_token) {
    throw new Error("Connection secret missing");
  }

  const refreshToken = decryptToken(secret.encrypted_refresh_token);
  try {
    const refreshed = await GoogleOAuthProvider.refreshAccessToken({
      refreshToken,
      clientId: oauth.clientId,
      clientSecret: oauth.clientSecret,
    });
    cacheAccessToken(connectionId, refreshed.accessToken, refreshed.expiryMs);
    await supabaseAdmin
      .from(TABLES.INTEGRATION_CONNECTIONS)
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", connectionId);
    return refreshed.accessToken;
  } catch (err) {
    const mapped = (err as { mapped?: { kind?: string; message?: string } })?.mapped;
    if (mapped?.kind === "invalid_grant") {
      await markNeedsReconnect(connectionId, mapped.message || "invalid_grant");
    }
    throw err;
  }
}

export async function setDefaultSender(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  connectionId: string;
  eventId?: string | null;
}): Promise<void> {
  if (opts.eventId) {
    await supabaseAdmin.from(TABLES.SENDER_PREFERENCES).upsert(
      {
        owner_type: opts.ownerType,
        owner_id: opts.ownerId,
        event_id: opts.eventId,
        connection_id: opts.connectionId,
      },
      { onConflict: "owner_type,owner_id,event_id" },
    );
  } else {
    // Partial unique index — delete then insert
    await supabaseAdmin
      .from(TABLES.SENDER_PREFERENCES)
      .delete()
      .eq("owner_type", opts.ownerType)
      .eq("owner_id", opts.ownerId)
      .is("event_id", null);
    await supabaseAdmin.from(TABLES.SENDER_PREFERENCES).insert({
      owner_type: opts.ownerType,
      owner_id: opts.ownerId,
      event_id: null,
      connection_id: opts.connectionId,
    });
  }
}
