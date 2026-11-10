import type { GoogleMappedError } from "../providers/google/errors";

const SAFE_BY_CODE: Record<string, string> = {
  NO_CONNECTION: "Connect Google first.",
  NOT_CONNECTED: "Connect Google first.",
  CONFIG:
    "Google connect isn’t available on this site yet. Ask your platform admin to finish setup.",
  NEEDS_RECONNECT: "Reconnect your Google account to continue.",
  QUOTA: "You’ve reached today’s email sending limit. Try again later.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
  SCOPE_MISSING: "That permission isn’t granted yet. Use Enable on the card to allow it.",
  PERMISSION: "That permission isn’t granted yet. Use Enable on the card to allow it.",
  ACCESS_DENIED: "Google access was denied.",
  ADMIN_BLOCKED: "Google blocked this app for your organization. Ask your admin to allow it.",
  FORBIDDEN: "You don’t have permission to do that.",
  NOT_FOUND: "We couldn’t find that connection.",
  SEND_FAILED: "We couldn’t send that email. Try again or reconnect Google.",
  DISABLED: "This connection is disabled.",
  OAUTH: "We couldn’t start Google connect. Try again.",
};

const SAFE_BY_KIND: Record<GoogleMappedError["kind"], string> = {
  invalid_grant: "Reconnect your Google account to continue.",
  rate_limit: "You’ve hit a Google rate limit. Try again in a minute.",
  access_denied: "Google access was denied.",
  admin_blocked: "Google blocked this app for your organization. Ask your admin to allow it.",
  scope_missing: "That permission isn’t granted yet. Use Enable on the card to allow it.",
  other: "Something went wrong with Google. Please try again.",
};

/** Map action codes / Google error kinds to organizer-safe copy (never raw JSON). */
export function formatConnectionUserError(
  codeOrMessage: string | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = String(codeOrMessage || "").trim();
  if (!raw) return fallback;

  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (SAFE_BY_CODE[upper]) return SAFE_BY_CODE[upper];
  if (SAFE_BY_CODE[raw]) return SAFE_BY_CODE[raw];

  const lower = raw.toLowerCase();
  if (lower.includes("not configured") || lower.includes("oauth is not configured")) {
    return SAFE_BY_CODE.CONFIG;
  }
  if (lower.includes("reconnect") || lower.includes("invalid_grant")) {
    return SAFE_BY_CODE.NEEDS_RECONNECT;
  }
  if (lower.includes("quota") || lower.includes("rate limit")) {
    return SAFE_BY_CODE.QUOTA;
  }
  if (
    (lower.includes("admin") && (lower.includes("block") || lower.includes("policy"))) ||
    lower.includes("blocked this app")
  ) {
    return SAFE_BY_CODE.ADMIN_BLOCKED;
  }
  if (
    lower.includes("capability not enabled") ||
    lower.includes("permission") ||
    lower.includes("scope")
  ) {
    return SAFE_BY_CODE.PERMISSION;
  }
  if (lower.includes("connect google") || lower.includes("no connection")) {
    return SAFE_BY_CODE.NO_CONNECTION;
  }

  // Drop Google JSON / HTML blobs
  if (raw.startsWith("{") || raw.includes("<html") || raw.length > 220) {
    return fallback;
  }
  return raw;
}

export function formatGoogleMappedError(mapped: GoogleMappedError | null | undefined): string {
  if (!mapped) return SAFE_BY_KIND.other;
  if (mapped.kind === "other") {
    return formatConnectionUserError(mapped.message, SAFE_BY_KIND.other);
  }
  return SAFE_BY_KIND[mapped.kind] || SAFE_BY_KIND.other;
}

export function formatSafeActionError(
  error: {
    code?: string;
    message?: string;
  } | null,
): string {
  if (!error) return formatConnectionUserError(null);
  const byCode = error.code ? SAFE_BY_CODE[error.code] : undefined;
  if (byCode) return byCode;
  return formatConnectionUserError(error.message || error.code);
}
