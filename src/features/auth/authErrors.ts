/**
 * Map Supabase Auth (and a few legacy) sign-in errors to safe user-facing copy.
 * Never reveal whether the email exists.
 */

const CREDENTIAL_MSG = "That email and password do not match an account.";
const GENERIC_MSG = "Could not sign you in. Please try again.";

function errorCode(err: unknown): string {
  return String((err as { code?: string })?.code ?? "")
    .trim()
    .toLowerCase();
}

function errorMessage(err: unknown): string {
  return String((err as { message?: string })?.message ?? "");
}

/** User-facing sign-in failure message. Logs unknown codes for ops. */
export function mapSignInAuthError(err: unknown): string {
  const code = errorCode(err);
  const message = errorMessage(err);
  const lower = message.toLowerCase();

  if (lower.includes("suspended")) return message;

  const credentialCodes = new Set([
    "invalid_credentials",
    "invalid_grant",
    "user_not_found",
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
  ]);
  if (credentialCodes.has(code) || lower.includes("invalid login credentials")) {
    return CREDENTIAL_MSG;
  }

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }

  if (
    code === "too_many_requests" ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return "Too many sign-in attempts. Wait a moment and try again.";
  }

  if (
    code === "user_banned" ||
    code === "auth/user-disabled" ||
    lower.includes("banned") ||
    lower.includes("disabled")
  ) {
    return "That account has been disabled.";
  }

  console.error("[mapSignInAuthError] unmapped sign-in error", {
    code,
    message: message.slice(0, 200),
  });
  return GENERIC_MSG;
}
