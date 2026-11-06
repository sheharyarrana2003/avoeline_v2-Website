import { createHash, randomBytes } from "crypto";
import type { OAuthProvider, OAuthStartParams, OAuthTokenSet, VerifiedIdToken } from "../provider";
import { mapGoogleOAuthError } from "./errors";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid ID token");
  const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export const GoogleOAuthProvider: OAuthProvider = {
  buildAuthorizeUrl(params: OAuthStartParams): string {
    const q = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      scope: params.scopes.join(" "),
      access_type: "offline",
      prompt: "select_account consent",
      include_granted_scopes: "true",
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
    });
    if (params.loginHint?.trim()) q.set("login_hint", params.loginHint.trim());
    return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
  },

  async exchangeCode(opts): Promise<OAuthTokenSet> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: opts.code,
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        redirect_uri: opts.redirectUri,
        grant_type: "authorization_code",
        code_verifier: opts.codeVerifier,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      const mapped = mapGoogleOAuthError(json.error, json.error_description);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    if (!json.refresh_token) {
      throw new Error("Google did not return a refresh token. Revoke prior access and try again.");
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiryMs: Date.now() + (json.expires_in ?? 3600) * 1000,
      idToken: json.id_token,
      scope: json.scope,
    };
  },

  async refreshAccessToken(opts) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        refresh_token: opts.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      const mapped = mapGoogleOAuthError(json.error, json.error_description);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    return {
      accessToken: json.access_token,
      expiryMs: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
  },

  async verifyIdToken(idToken: string, clientId: string): Promise<VerifiedIdToken> {
    // Verify signature via Google tokeninfo (acceptable for server callback; no Google SDK).
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) throw new Error("ID token verification failed");
    const payload = (await res.json()) as Record<string, string>;
    const iss = payload.iss;
    if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") {
      throw new Error("Invalid ID token issuer");
    }
    if (payload.aud !== clientId) throw new Error("Invalid ID token audience");
    const exp = Number(payload.exp || 0) * 1000;
    if (!exp || exp < Date.now() - 30_000) throw new Error("ID token expired");
    if (String(payload.email_verified) !== "true") {
      throw new Error("Google email is not verified");
    }
    if (!payload.sub || !payload.email) throw new Error("ID token missing sub/email");
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: true,
      name: payload.name,
      picture: payload.picture,
      hd: payload.hd || undefined,
    };
  },

  async revokeToken(token: string, _clientId: string): Promise<void> {
    void _clientId;
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).catch(() => undefined);
  },
};

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomUrlSafe(64);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

/** Local decode helper for tests (does not verify). */
export function peekIdTokenClaims(idToken: string): Record<string, unknown> {
  return decodeJwtPayload(idToken);
}
