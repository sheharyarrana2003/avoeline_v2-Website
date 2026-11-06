import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getGoogleOAuthConfig } from "@/src/env";
import { getCatalogEntry, requiredScopesForCapability } from "../catalog";
import {
  GoogleOAuthProvider,
  hashOAuthState,
  pkcePair,
  randomUrlSafe,
} from "../providers/google/oauth";
import { mapGoogleOAuthError, missingRequiredScopes } from "../providers/google/errors";
import {
  assertGoogleNotKilled,
  googleConnectionsConfigured,
  upsertGoogleConnection,
} from "./connections.service";
import { encryptToken, decryptToken } from "./tokens.service";
import { writeConnectionAudit } from "./audit.service";
import { sameOriginReturnTo } from "../lib/returnTo";
import { oauthStateGate, scopeDowngradeBlocks } from "../lib/oauthState.logic";
import {
  isWorkspaceOAuthCapability,
  WORKSPACE_CAPABILITIES,
  WORKSPACE_GOOGLE_SCOPES,
  WORKSPACE_OAUTH_CAPABILITY,
} from "../lib/workspaceScopes.logic";
import type { ConnectionCapability, ConnectionOwnerType } from "../types";

const STATE_TTL_MS = 10 * 60 * 1000;

export async function startOAuthConnect(opts: {
  userId: string;
  ownerType: ConnectionOwnerType;
  ownerId: string;
  capability: ConnectionCapability | typeof WORKSPACE_OAUTH_CAPABILITY;
  returnTo: string;
  origin: string;
  loginHint?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string; code?: string }> {
  if (!googleConnectionsConfigured()) {
    return {
      ok: false,
      code: "CONFIG",
      error:
        "Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID / SECRET / REDIRECT_URI / CONNECTIONS_ENCRYPTION_KEY).",
    };
  }
  const workspace = isWorkspaceOAuthCapability(opts.capability);
  if (!workspace) {
    const entry = getCatalogEntry(opts.capability as ConnectionCapability);
    if (!entry?.active) {
      return { ok: false, code: "INACTIVE", error: "This integration is not available yet." };
    }
  }

  const killed = await assertGoogleNotKilled({
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    actorId: opts.userId,
  });
  if (!killed.ok) return { ok: false, code: "DISABLED", error: killed.error };

  const oauth = getGoogleOAuthConfig();
  const { verifier, challenge } = pkcePair();
  const state = randomUrlSafe(32);
  const stateHash = hashOAuthState(state);
  const returnTo = sameOriginReturnTo(opts.returnTo, opts.origin);
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from(TABLES.OAUTH_STATES).insert({
    state_hash: stateHash,
    code_verifier_enc: encryptToken(verifier),
    user_id: opts.userId,
    owner_type: opts.ownerType,
    owner_id: opts.ownerId,
    capability: opts.capability,
    return_to: returnTo,
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: "Could not start OAuth." };

  const scopes = workspace
    ? [...WORKSPACE_GOOGLE_SCOPES]
    : requiredScopesForCapability(opts.capability as ConnectionCapability);
  const url = GoogleOAuthProvider.buildAuthorizeUrl({
    state,
    codeChallenge: challenge,
    scopes,
    loginHint: opts.loginHint,
    redirectUri: oauth.redirectUri!,
    clientId: oauth.clientId!,
  });
  return { ok: true, url };
}

export async function handleOAuthCallback(opts: {
  provider: string;
  code?: string | null;
  state?: string | null;
  oauthError?: string | null;
  oauthErrorDescription?: string | null;
  userId: string;
  origin: string;
}): Promise<{ redirectTo: string }> {
  const fallback = "/";
  if (opts.provider !== "google") {
    return { redirectTo: `${fallback}?e=${encodeURIComponent("Unsupported provider")}` };
  }

  if (opts.oauthError) {
    const mapped = mapGoogleOAuthError(opts.oauthError, opts.oauthErrorDescription);
    return {
      redirectTo: `/organizer/settings/connections?e=${encodeURIComponent(mapped.message)}`,
    };
  }
  if (!opts.code || !opts.state) {
    return {
      redirectTo: `/organizer/settings/connections?e=${encodeURIComponent("Missing OAuth code")}`,
    };
  }

  const stateHash = hashOAuthState(opts.state);
  const { data: row, error } = await supabaseAdmin
    .from(TABLES.OAUTH_STATES)
    .select(
      "id, user_id, owner_type, owner_id, capability, return_to, expires_at, used_at, code_verifier_enc",
    )
    .eq("state_hash", stateHash)
    .maybeSingle();

  if (error || !row) {
    return {
      redirectTo: `/organizer/settings/connections?e=${encodeURIComponent("Invalid OAuth state")}`,
    };
  }

  const returnBase =
    row.return_to ||
    (row.owner_type === "user" ? `/organizer/${row.owner_id}/settings/connections` : "/");

  const gate = oauthStateGate({
    usedAt: row.used_at,
    expiresAt: String(row.expires_at),
    stateUserId: String(row.user_id),
    actorId: opts.userId,
  });
  if (!gate.ok) {
    const msg =
      gate.reason === "used"
        ? "OAuth state already used"
        : gate.reason === "expired"
          ? "OAuth state expired"
          : "OAuth session mismatch";
    return { redirectTo: `${returnBase}?e=${encodeURIComponent(msg)}` };
  }

  await supabaseAdmin
    .from(TABLES.OAUTH_STATES)
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  const oauth = getGoogleOAuthConfig();
  if (!oauth.clientId || !oauth.clientSecret || !oauth.redirectUri) {
    return { redirectTo: `${returnBase}?e=${encodeURIComponent("OAuth not configured")}` };
  }

  try {
    const verifier = decryptToken(row.code_verifier_enc);
    const tokens = await GoogleOAuthProvider.exchangeCode({
      code: opts.code,
      codeVerifier: verifier,
      redirectUri: oauth.redirectUri,
      clientId: oauth.clientId,
      clientSecret: oauth.clientSecret,
    });

    if (!tokens.idToken) {
      return { redirectTo: `${returnBase}?e=${encodeURIComponent("Missing ID token")}` };
    }
    const identity = await GoogleOAuthProvider.verifyIdToken(tokens.idToken, oauth.clientId);

    const workspace = isWorkspaceOAuthCapability(String(row.capability));
    const required = workspace
      ? [...WORKSPACE_GOOGLE_SCOPES]
      : requiredScopesForCapability(row.capability as ConnectionCapability);
    const granted = (tokens.scope || "").split(/[\s,]+/).filter(Boolean);
    const missing = missingRequiredScopes(granted, required);
    if (scopeDowngradeBlocks(missing)) {
      await writeConnectionAudit({
        ownerType: row.owner_type as ConnectionOwnerType,
        ownerId: row.owner_id,
        actorId: opts.userId,
        action: "scope_rejected",
        details: { missing },
      });
      return {
        redirectTo: `${returnBase}?e=${encodeURIComponent(
          `You didn't allow: ${missing.join(", ")}. Try again and leave those permissions checked.`,
        )}`,
      };
    }

    if (!tokens.refreshToken) {
      return {
        redirectTo: `${returnBase}?e=${encodeURIComponent(
          "Google did not return a refresh token. Disconnect the app in Google Account → Security → Third-party access, then connect again.",
        )}`,
      };
    }

    const cap = row.capability as ConnectionCapability;
    // Calendar/Meet share calendar.events; Drive/Sheets share drive.file; workspace = all.
    const capabilities: ConnectionCapability[] = workspace
      ? [...WORKSPACE_CAPABILITIES]
      : cap === "calendar" || cap === "meet"
        ? ["calendar", "meet"]
        : cap === "drive.files" || cap === "sheets.sync"
          ? ["drive.files", "sheets.sync"]
          : [cap];
    const conn = await upsertGoogleConnection({
      ownerType: row.owner_type as ConnectionOwnerType,
      ownerId: row.owner_id,
      providerAccountId: identity.sub,
      providerEmail: identity.email,
      displayName: identity.name ?? null,
      avatarUrl: identity.picture ?? null,
      grantedScopes: granted.length ? granted : required,
      refreshToken: tokens.refreshToken,
      connectedBy: opts.userId,
      capabilities,
      isWorkspace: Boolean(identity.hd),
    });

    return {
      redirectTo: `${returnBase}?ok=${encodeURIComponent("Connected")}&connectionId=${conn.id}`,
    };
  } catch (err) {
    const mapped = (err as { mapped?: { kind?: string; message?: string } })?.mapped;
    if (mapped?.kind === "admin_blocked") {
      // Best-effort: if we somehow have a connection id later; for now audit only
      await writeConnectionAudit({
        ownerType: row.owner_type as ConnectionOwnerType,
        ownerId: row.owner_id,
        actorId: opts.userId,
        action: "blocked_by_admin",
        details: { message: mapped.message },
      });
    }
    const message = err instanceof Error ? err.message : "Google connect failed";
    return { redirectTo: `${returnBase}?e=${encodeURIComponent(message)}` };
  }
}

export { sameOriginReturnTo } from "../lib/returnTo";
export { markBlockedByAdmin } from "./connections.service";
