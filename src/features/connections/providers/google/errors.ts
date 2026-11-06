export type GoogleMappedError =
  | { kind: "invalid_grant"; message: string }
  | { kind: "rate_limit"; message: string; retryAfterMs?: number }
  | { kind: "access_denied"; message: string }
  | { kind: "admin_blocked"; message: string }
  | { kind: "scope_missing"; message: string; missing: string[] }
  | { kind: "other"; message: string; status?: number };

export function mapGoogleOAuthError(
  error: string | null | undefined,
  description?: string | null,
): GoogleMappedError {
  const code = (error || "").toLowerCase();
  const desc = (description || "").toLowerCase();
  if (code === "access_denied") {
    if (desc.includes("admin") || desc.includes("policy") || desc.includes("blocked")) {
      return {
        kind: "admin_blocked",
        message:
          "Your organization's Google admin must allow this app. Connect a personal Gmail, or ask them to allow the OAuth client.",
      };
    }
    return { kind: "access_denied", message: description || "Google access was denied." };
  }
  if (code === "invalid_grant" || desc.includes("invalid_grant")) {
    return {
      kind: "invalid_grant",
      message: description || "Google refresh token is invalid. Reconnect.",
    };
  }
  return { kind: "other", message: description || error || "Google OAuth error" };
}

export function mapGoogleApiError(status: number, body: string): GoogleMappedError {
  const lower = body.toLowerCase();
  if (status === 401 || lower.includes("invalid_grant") || lower.includes("invalid credentials")) {
    return {
      kind: "invalid_grant",
      message: "Google authorization expired. Reconnect your account.",
    };
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("quota")) {
    const retryMatch = /retry[_\s-]?after[=:\s]+(\d+)/i.exec(body);
    const retryAfterMs = retryMatch ? Number(retryMatch[1]) * 1000 : 60_000;
    return { kind: "rate_limit", message: "Google rate limit hit.", retryAfterMs };
  }
  if (lower.includes("admin") && (lower.includes("policy") || lower.includes("blocked"))) {
    return {
      kind: "admin_blocked",
      message: "Your organization's Google admin has blocked this app.",
    };
  }
  return { kind: "other", message: body.slice(0, 500) || `Google API error (${status})`, status };
}

export function missingRequiredScopes(granted: string[], required: string[]): string[] {
  const set = new Set(granted.map((s) => s.trim()).filter(Boolean));
  return required.filter((r) => r !== "openid" && r !== "email" && !set.has(r));
}
