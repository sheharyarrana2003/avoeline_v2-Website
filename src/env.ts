import { z } from "zod";

/**
 * Env validation (ENGINEERING_RULES C9).
 * Public vars may be read anywhere. Server vars are parsed on first getServerEnv().
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  /** Cloudflare Turnstile site key (contact form). Omit to hide the widget. */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  /** Required when compete cookies are used; optional at boot so CI build works. */
  HACKATHON_COMPETE_SECRET: z.string().min(16).optional(),
  /** HMAC for door QR / check-in tokens (N4); required at use site. */
  REGISTRATION_QR_SECRET: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Default/fallback From only (`info@…`). Lane aliases override via RESEND_FROM_*. */
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  RESEND_REPLY_TO: z.string().min(1).optional(),
  RESEND_ARCHIVE_BCC: z.string().min(1).optional(),
  RESEND_FROM_NOTIFICATIONS: z.string().min(1).optional(),
  RESEND_FROM_EVENTS: z.string().min(1).optional(),
  RESEND_FROM_BILLING: z.string().min(1).optional(),
  RESEND_FROM_ONBOARDING: z.string().min(1).optional(),
  RESEND_FROM_SUPPORT: z.string().min(1).optional(),
  RESEND_FROM_SECURITY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
  /** Local only: `mailpit` routes organizer mail to SMTP (see docker-compose.mailpit.yml). */
  EMAIL_TRANSPORT: z.enum(["google", "mailpit"]).optional(),
  MAILPIT_SMTP_URL: z.string().optional(),
  BREVO_API_KEY: z.string().min(1).optional(),
  /** AES key material for organizer email connection secrets (min 16 chars). */
  EMAIL_CONNECTION_SECRET: z.string().min(16).optional(),
  /** Preferred Connections encryption key (docs/17); aliases EMAIL_CONNECTION_SECRET. */
  CONNECTIONS_ENCRYPTION_KEY: z.string().min(16).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  /** Preferred Google OAuth names (docs/17); alias GOOGLE_CLIENT_*. */
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  /** Global kill switch for Google connections (`true`/`false`). Missing = enabled when OAuth configured. */
  CONNECTIONS_GOOGLE_ENABLED: z.enum(["true", "false"]).optional(),
  /** Google Picker (Connections C4) — restrict by HTTP referrer in Cloud Console. */
  GOOGLE_PICKER_API_KEY: z.string().min(1).optional(),
  GOOGLE_PICKER_APP_ID: z.string().min(1).optional(),
  PLATFORM_ADMIN_EMAILS: z.string().optional(),
  SAAS_OWNER_EMAILS: z.string().optional(),
  /** Protects /api/cron/* (Authorization: Bearer or ?secret=). */
  CRON_SECRET: z.string().min(16).optional(),
  /** Platform Resend daily budget (docs/16). */
  PLATFORM_EMAIL_DAILY_CAP: z.string().optional(),
  PLATFORM_EMAIL_ESSENTIAL_RESERVE: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_URL: z.string().optional(),
  /** Server-only Gemini for feedback analysis (never NEXT_PUBLIC_). */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  /** Cloudflare Turnstile secret — when set, contact form verifies tokens. */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function readPublic(): PublicEnv {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  });
}

function readServer(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    HACKATHON_COMPETE_SECRET: process.env.HACKATHON_COMPETE_SECRET || undefined,
    REGISTRATION_QR_SECRET: process.env.REGISTRATION_QR_SECRET || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || undefined,
    RESEND_FROM: process.env.RESEND_FROM || undefined,
    RESEND_REPLY_TO: process.env.RESEND_REPLY_TO || undefined,
    RESEND_ARCHIVE_BCC: process.env.RESEND_ARCHIVE_BCC || undefined,
    RESEND_FROM_NOTIFICATIONS: process.env.RESEND_FROM_NOTIFICATIONS || undefined,
    RESEND_FROM_EVENTS: process.env.RESEND_FROM_EVENTS || undefined,
    RESEND_FROM_BILLING: process.env.RESEND_FROM_BILLING || undefined,
    RESEND_FROM_ONBOARDING: process.env.RESEND_FROM_ONBOARDING || undefined,
    RESEND_FROM_SUPPORT: process.env.RESEND_FROM_SUPPORT || undefined,
    RESEND_FROM_SECURITY: process.env.RESEND_FROM_SECURITY || undefined,
    MAIL_FROM: process.env.MAIL_FROM || undefined,
    EMAIL_TRANSPORT: (process.env.EMAIL_TRANSPORT === "mailpit" ||
    process.env.EMAIL_TRANSPORT === "google"
      ? process.env.EMAIL_TRANSPORT
      : undefined) as "google" | "mailpit" | undefined,
    MAILPIT_SMTP_URL: process.env.MAILPIT_SMTP_URL || undefined,
    BREVO_API_KEY: process.env.BREVO_API_KEY || undefined,
    EMAIL_CONNECTION_SECRET: process.env.EMAIL_CONNECTION_SECRET || undefined,
    CONNECTIONS_ENCRYPTION_KEY: process.env.CONNECTIONS_ENCRYPTION_KEY || undefined,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || undefined,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || undefined,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || undefined,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI || undefined,
    CONNECTIONS_GOOGLE_ENABLED: (process.env.CONNECTIONS_GOOGLE_ENABLED === "true" ||
    process.env.CONNECTIONS_GOOGLE_ENABLED === "false"
      ? process.env.CONNECTIONS_GOOGLE_ENABLED
      : undefined) as "true" | "false" | undefined,
    GOOGLE_PICKER_API_KEY: process.env.GOOGLE_PICKER_API_KEY || undefined,
    GOOGLE_PICKER_APP_ID: process.env.GOOGLE_PICKER_APP_ID || undefined,
    PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS || undefined,
    SAAS_OWNER_EMAILS: process.env.SAAS_OWNER_EMAILS || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    PLATFORM_EMAIL_DAILY_CAP: process.env.PLATFORM_EMAIL_DAILY_CAP || undefined,
    PLATFORM_EMAIL_ESSENTIAL_RESERVE: process.env.PLATFORM_EMAIL_ESSENTIAL_RESERVE || undefined,
    AI_API_KEY: process.env.AI_API_KEY || undefined,
    AI_URL: process.env.AI_URL || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
    NODE_ENV: process.env.NODE_ENV as ServerEnv["NODE_ENV"],
  });
}

let publicCache: PublicEnv | null = null;
let serverCache: ServerEnv | null = null;

/** Client-safe public env. Fail-fast when NEXT_PUBLIC_* are missing/invalid. */
export function getPublicEnv(): PublicEnv {
  if (!publicCache) publicCache = readPublic();
  return publicCache;
}

/** Server env including secrets. Call only from server modules. */
export function getServerEnv(): ServerEnv {
  if (!serverCache) serverCache = readServer();
  return serverCache;
}

/** Compete HMAC — required at use site (S7), not at boot. Prefer live process.env so tests can set it. */
export function requireCompeteSecret(): string {
  const live = process.env.HACKATHON_COMPETE_SECRET?.trim();
  const value = live && live.length >= 16 ? live : getServerEnv().HACKATHON_COMPETE_SECRET?.trim();
  if (!value || value.length < 16) {
    throw new Error(
      "HACKATHON_COMPETE_SECRET is required (do not fall back to the service-role key).",
    );
  }
  return value;
}

/** Door QR / check-in HMAC — required at use site (N4), not at boot. */
export function requireRegistrationQrSecret(): string {
  const live = process.env.REGISTRATION_QR_SECRET?.trim();
  const value = live && live.length >= 16 ? live : getServerEnv().REGISTRATION_QR_SECRET?.trim();
  if (!value || value.length < 16) {
    throw new Error(
      "REGISTRATION_QR_SECRET is required (do not fall back to the service-role key).",
    );
  }
  return value;
}

/** Connections AES key: CONNECTIONS_ENCRYPTION_KEY, else EMAIL_CONNECTION_SECRET. */
export function getConnectionsEncryptionKey(): string | undefined {
  const env = getServerEnv();
  const key = env.CONNECTIONS_ENCRYPTION_KEY?.trim() || env.EMAIL_CONNECTION_SECRET?.trim();
  return key && key.length >= 16 ? key : undefined;
}

/** Google OAuth client credentials with docs/17 names preferred over legacy aliases. */
export function getGoogleOAuthConfig(): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  redirectUri: string | undefined;
} {
  const env = getServerEnv();
  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID?.trim() || env.GOOGLE_CLIENT_ID?.trim() || undefined,
    clientSecret:
      env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || env.GOOGLE_CLIENT_SECRET?.trim() || undefined,
    redirectUri:
      env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || env.GOOGLE_REDIRECT_URI?.trim() || undefined,
  };
}

/** Global Google connections kill switch. Missing env → enabled. */
export function isConnectionsGoogleEnabled(): boolean {
  return getServerEnv().CONNECTIONS_GOOGLE_ENABLED !== "false";
}

/** Google Picker browser credentials (API key restricted by HTTP referrer). */
export function getGooglePickerConfig(): {
  apiKey: string | undefined;
  appId: string | undefined;
} {
  const env = getServerEnv();
  const apiKey = env.GOOGLE_PICKER_API_KEY?.trim() || undefined;
  const appId = env.GOOGLE_PICKER_APP_ID?.trim() || undefined;
  warnPickerConfigOnce(apiKey, appId);
  return { apiKey, appId };
}

let pickerWarned = false;
function warnPickerConfigOnce(apiKey: string | undefined, appId: string | undefined): void {
  if (pickerWarned) return;
  if (process.env.NODE_ENV !== "production") return;
  if (apiKey && appId) return;
  pickerWarned = true;
  console.warn(
    "[env] GOOGLE_PICKER_API_KEY / GOOGLE_PICKER_APP_ID missing in production — Google Picker will fail. See docs/connections-picker-setup.md (A5).",
  );
}

/** Presence/format diagnostics for admin — never returns secret values. */
export function diagnoseGooglePickerEnv(): {
  apiKeyPresent: boolean;
  apiKeyLengthOk: boolean;
  apiKeyLooksLikeBrowserKey: boolean;
  appIdPresent: boolean;
  appIdLooksNumeric: boolean;
  oauthClientIdPresent: boolean;
} {
  const picker = getGooglePickerConfig();
  const oauth = getGoogleOAuthConfig();
  const apiKey = picker.apiKey || "";
  const appId = picker.appId || "";
  return {
    apiKeyPresent: apiKey.length > 0,
    apiKeyLengthOk: apiKey.length >= 20,
    apiKeyLooksLikeBrowserKey: apiKey.startsWith("AIza"),
    appIdPresent: appId.length > 0,
    appIdLooksNumeric: /^\d{6,}$/.test(appId),
    oauthClientIdPresent: Boolean(oauth.clientId),
  };
}

const CONNECTIONS_CALLBACK_PATH = "/api/connections/google/callback";

/**
 * Admin-only Connections OAuth diagnostics — presence flags and expected redirect path.
 * Never returns client secrets, encryption keys, or credential values.
 * Reads process.env directly so unit tests need no full server env.
 */
export function diagnoseGoogleConnectionsEnv(): {
  ready: boolean;
  googleEnabled: boolean;
  variables: Array<{ name: string; present: boolean; legacyAlias?: string }>;
  expectedRedirectPath: string;
  expectedRedirectUriHint: string;
} {
  const pe = process.env;
  const clientIdPresent = Boolean(pe.GOOGLE_OAUTH_CLIENT_ID?.trim() || pe.GOOGLE_CLIENT_ID?.trim());
  const clientSecretPresent = Boolean(
    pe.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || pe.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const redirectPresent = Boolean(
    pe.GOOGLE_OAUTH_REDIRECT_URI?.trim() || pe.GOOGLE_REDIRECT_URI?.trim(),
  );
  const enc = pe.CONNECTIONS_ENCRYPTION_KEY?.trim() || pe.EMAIL_CONNECTION_SECRET?.trim() || "";
  const encryptionPresent = enc.length >= 16;
  const googleEnabled = pe.CONNECTIONS_GOOGLE_ENABLED !== "false";

  const site =
    pe.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (pe.VERCEL_URL ? `https://${pe.VERCEL_URL}` : "http://localhost:3000");

  return {
    ready: Boolean(
      clientIdPresent &&
      clientSecretPresent &&
      redirectPresent &&
      encryptionPresent &&
      googleEnabled,
    ),
    googleEnabled,
    variables: [
      {
        name: "GOOGLE_OAUTH_CLIENT_ID",
        present: clientIdPresent,
        legacyAlias: "GOOGLE_CLIENT_ID",
      },
      {
        name: "GOOGLE_OAUTH_CLIENT_SECRET",
        present: clientSecretPresent,
        legacyAlias: "GOOGLE_CLIENT_SECRET",
      },
      {
        name: "GOOGLE_OAUTH_REDIRECT_URI",
        present: redirectPresent,
        legacyAlias: "GOOGLE_REDIRECT_URI",
      },
      {
        name: "CONNECTIONS_ENCRYPTION_KEY",
        present: encryptionPresent,
        legacyAlias: "EMAIL_CONNECTION_SECRET",
      },
      {
        name: "CONNECTIONS_GOOGLE_ENABLED",
        present: googleEnabled,
      },
    ],
    expectedRedirectPath: CONNECTIONS_CALLBACK_PATH,
    expectedRedirectUriHint: `${site}${CONNECTIONS_CALLBACK_PATH}`,
  };
}
