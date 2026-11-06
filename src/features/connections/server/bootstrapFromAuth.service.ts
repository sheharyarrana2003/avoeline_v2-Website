import "server-only";

import type { Session, User } from "@supabase/supabase-js";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import {
  googleConnectionsConfigured,
  listConnections,
  upsertGoogleConnection,
} from "./connections.service";
import {
  shouldBootstrapGoogleWorkspace,
  WORKSPACE_CAPABILITIES,
  WORKSPACE_GOOGLE_SCOPES,
} from "../lib/workspaceScopes.logic";
import type { ConnectionOwnerType } from "../types";

function googleIdentity(user: User): {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  hd: string | null;
} | null {
  const identity = (user.identities || []).find((i) => i.provider === "google");
  const data = (identity?.identity_data || {}) as Record<string, unknown>;
  const sub = String(data.sub || identity?.id || "").trim();
  const email = String(data.email || user.email || "").trim();
  if (!sub || !email) return null;
  return {
    sub,
    email,
    name: data.full_name || data.name ? String(data.full_name || data.name) : null,
    picture: data.avatar_url || data.picture ? String(data.avatar_url || data.picture) : null,
    hd: data.hd ? String(data.hd) : null,
  };
}

/**
 * After Supabase Google sign-in: if organizer/vendor and we received a refresh
 * token (same Google Cloud OAuth client as Connections), create the Connections
 * row with Gmail + Calendar + Drive scopes.
 *
 * Requires Supabase Auth Google provider to use the same Client ID/Secret as
 * `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.
 */
export async function maybeBootstrapGoogleWorkspaceFromAuth(opts: {
  user: User;
  session: Session | null;
  userType: string;
}): Promise<{ linked: boolean; needsWorkspaceOAuth: boolean }> {
  if (!shouldBootstrapGoogleWorkspace(opts.userType)) {
    return { linked: false, needsWorkspaceOAuth: false };
  }
  if (!googleConnectionsConfigured()) {
    return { linked: false, needsWorkspaceOAuth: false };
  }

  const ownerType: ConnectionOwnerType = "user";
  const ownerId = opts.user.id;
  const existing = await listConnections({ ownerType, ownerId, includeQuota: false });
  if (existing.some((c) => c.status === "active" && c.provider === "google")) {
    return { linked: true, needsWorkspaceOAuth: false };
  }

  const refresh = opts.session?.provider_refresh_token?.trim();
  const identity = googleIdentity(opts.user);
  if (!refresh || !identity) {
    return { linked: false, needsWorkspaceOAuth: true };
  }

  try {
    await upsertGoogleConnection({
      ownerType,
      ownerId,
      providerAccountId: identity.sub,
      providerEmail: identity.email,
      displayName: identity.name,
      avatarUrl: identity.picture,
      grantedScopes: [...WORKSPACE_GOOGLE_SCOPES],
      refreshToken: refresh,
      connectedBy: ownerId,
      capabilities: [...WORKSPACE_CAPABILITIES],
      isWorkspace: Boolean(identity.hd),
    });
    return { linked: true, needsWorkspaceOAuth: false };
  } catch (err) {
    console.warn("[bootstrapGoogleWorkspace]", err);
    return { linked: false, needsWorkspaceOAuth: true };
  }
}

export async function hasActiveGoogleConnection(ownerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("owner_type", "user")
    .eq("owner_id", ownerId)
    .eq("provider", "google")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}
