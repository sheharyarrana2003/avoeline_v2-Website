import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getServerEnv } from "@/src/env";
import {
  decryptSecret,
  emailConnectionSecretConfigured,
  encryptSecret,
} from "@/src/lib/email/secretCrypto";
import { logger } from "@/src/lib/logger";
import type {
  EmailConnectionCreatedBy,
  EmailConnectionProvider,
  EmailConnectionStatus,
  OrganizerEmailConnectionPublic,
} from "@/src/features/email/types";

export type GoogleSecrets = {
  refresh_token: string;
  access_token?: string;
  expiry?: number;
};

export type SmtpSecrets = {
  password: string;
};

type ConnectionRow = {
  id: string;
  organizer_id: string;
  provider: string;
  from_email: string;
  from_name: string | null;
  status: string;
  created_by: string;
  provisioned_by: string | null;
  secrets_ciphertext: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  google_account_email: string | null;
  last_error: string | null;
  last_tested_at: string | null;
  updated_at: string;
};

function toPublic(row: ConnectionRow): OrganizerEmailConnectionPublic {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    provider: row.provider as EmailConnectionProvider,
    fromEmail: row.from_email,
    fromName: row.from_name,
    status: row.status as EmailConnectionStatus,
    createdBy: row.created_by as EmailConnectionCreatedBy,
    googleAccountEmail: row.google_account_email,
    smtpHost: row.smtp_host,
    lastError: row.last_error,
    lastTestedAt: row.last_tested_at,
    updatedAt: row.updated_at,
  };
}

export async function getOrganizerEmailConnection(
  organizerId: string,
): Promise<OrganizerEmailConnectionPublic | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .select(
      "id, organizer_id, provider, from_email, from_name, status, created_by, provisioned_by, secrets_ciphertext, smtp_host, smtp_port, smtp_secure, smtp_user, google_account_email, last_error, last_tested_at, updated_at",
    )
    .eq("organizer_id", organizerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toPublic(data as ConnectionRow);
}

export async function hasActiveOrganizerEmailConnection(organizerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .select("id")
    .eq("organizer_id", organizerId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data?.id);
}

const CONNECTION_COLS =
  "id, organizer_id, provider, from_email, from_name, status, created_by, provisioned_by, secrets_ciphertext, smtp_host, smtp_port, smtp_secure, smtp_user, google_account_email, last_error, last_tested_at, updated_at";

export async function getActiveConnectionRow(organizerId: string): Promise<ConnectionRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .select(CONNECTION_COLS)
    .eq("organizer_id", organizerId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow | null) ?? null;
}

export function googleOAuthConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.GOOGLE_CLIENT_ID?.trim() &&
    env.GOOGLE_CLIENT_SECRET?.trim() &&
    env.GOOGLE_REDIRECT_URI?.trim() &&
    emailConnectionSecretConfigured(),
  );
}

export function buildGoogleAuthUrl(state: string, loginHint?: string): string | null {
  const env = getServerEnv();
  if (!googleOAuthConfigured()) return null;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: ["openid", "email", "https://www.googleapis.com/auth/gmail.send"].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  const hint = loginHint?.trim();
  if (hint) params.set("login_hint", hint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  refresh_token: string;
  access_token: string;
  expiry: number;
  email: string;
}> {
  const env = getServerEnv();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || "Google token exchange failed",
    );
  }
  if (!tokenJson.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke prior access and try again.");
  }
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as { email?: string };
  if (!profile.email) throw new Error("Could not read Google account email");
  return {
    refresh_token: tokenJson.refresh_token,
    access_token: tokenJson.access_token,
    expiry: Date.now() + (tokenJson.expires_in ?? 3600) * 1000,
    email: profile.email,
  };
}

export async function upsertGoogleConnection(opts: {
  organizerId: string;
  email: string;
  secrets: GoogleSecrets;
  createdBy: EmailConnectionCreatedBy;
  provisionedBy?: string | null;
}): Promise<OrganizerEmailConnectionPublic> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .upsert(
      {
        organizer_id: opts.organizerId,
        provider: "google",
        from_email: opts.email,
        from_name: null,
        status: "active",
        created_by: opts.createdBy,
        provisioned_by: opts.provisionedBy ?? null,
        secrets_ciphertext: encryptSecret(JSON.stringify(opts.secrets)),
        google_account_email: opts.email,
        smtp_host: null,
        smtp_port: null,
        smtp_secure: null,
        smtp_user: null,
        last_error: null,
        updated_at: now,
      },
      { onConflict: "organizer_id" },
    )
    .select(
      "id, organizer_id, provider, from_email, from_name, status, created_by, provisioned_by, secrets_ciphertext, smtp_host, smtp_port, smtp_secure, smtp_user, google_account_email, last_error, last_tested_at, updated_at",
    )
    .single();
  if (error || !data) throw error || new Error("Failed to save Google connection");
  logger.info("[upsertGoogleConnection]", { organizerId: opts.organizerId });
  return toPublic(data as ConnectionRow);
}

export async function upsertSmtpConnection(opts: {
  organizerId: string;
  fromEmail: string;
  fromName?: string | null;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  createdBy: EmailConnectionCreatedBy;
  provisionedBy?: string | null;
}): Promise<OrganizerEmailConnectionPublic> {
  const now = new Date().toISOString();
  const secrets: SmtpSecrets = { password: opts.password };
  const { data, error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .upsert(
      {
        organizer_id: opts.organizerId,
        provider: "smtp",
        from_email: opts.fromEmail,
        from_name: opts.fromName || null,
        status: "active",
        created_by: opts.createdBy,
        provisioned_by: opts.provisionedBy ?? null,
        secrets_ciphertext: encryptSecret(JSON.stringify(secrets)),
        google_account_email: null,
        smtp_host: opts.host,
        smtp_port: opts.port,
        smtp_secure: opts.secure,
        smtp_user: opts.user,
        last_error: null,
        updated_at: now,
      },
      { onConflict: "organizer_id" },
    )
    .select(
      "id, organizer_id, provider, from_email, from_name, status, created_by, provisioned_by, secrets_ciphertext, smtp_host, smtp_port, smtp_secure, smtp_user, google_account_email, last_error, last_tested_at, updated_at",
    )
    .single();
  if (error || !data) throw error || new Error("Failed to save SMTP connection");
  logger.info("[upsertSmtpConnection]", {
    organizerId: opts.organizerId,
    createdBy: opts.createdBy,
  });
  return toPublic(data as ConnectionRow);
}

export async function revokeOrganizerEmailConnection(organizerId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .update({
      status: "revoked",
      secrets_ciphertext: null,
      last_error: null,
      updated_at: now,
    })
    .eq("organizer_id", organizerId);
  if (error) throw error;
  logger.info("[revokeOrganizerEmailConnection]", { organizerId });
}

export function readConnectionSecrets(row: ConnectionRow): GoogleSecrets | SmtpSecrets {
  if (!row.secrets_ciphertext) throw new Error("Connection has no secrets stored");
  return JSON.parse(decryptSecret(row.secrets_ciphertext)) as GoogleSecrets | SmtpSecrets;
}

export async function markConnectionTested(
  organizerId: string,
  ok: boolean,
  errorMessage?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .update({
      last_tested_at: now,
      last_error: ok ? null : (errorMessage || "Test send failed").slice(0, 500),
      status: ok ? "active" : "error",
      updated_at: now,
    })
    .eq("organizer_id", organizerId);
}

export async function refreshGoogleAccessToken(row: ConnectionRow): Promise<string> {
  const secrets = readConnectionSecrets(row) as GoogleSecrets;
  if (secrets.access_token && secrets.expiry && secrets.expiry > Date.now() + 60_000) {
    return secrets.access_token;
  }
  const env = getServerEnv();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: secrets.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error || "Google refresh failed");
  }
  const next: GoogleSecrets = {
    refresh_token: secrets.refresh_token,
    access_token: tokenJson.access_token,
    expiry: Date.now() + (tokenJson.expires_in ?? 3600) * 1000,
  };
  await supabaseAdmin
    .from(TABLES.ORGANIZER_EMAIL_CONNECTIONS)
    .update({
      secrets_ciphertext: encryptSecret(JSON.stringify(next)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  return tokenJson.access_token;
}
