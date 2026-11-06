/** Pure security assertions for Connections C6 (unit-testable). */

const RESTRICTED_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
];

const ALLOWED_GOOGLE_SCOPES = new Set([
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
]);

export function hasRestrictedScope(scopes: string[]): boolean {
  return scopes.some(
    (s) => RESTRICTED_SCOPES.includes(s) || s === "https://www.googleapis.com/auth/drive",
  );
}

export function onlyAllowedScopes(scopes: string[]): boolean {
  return scopes.every((s) => ALLOWED_GOOGLE_SCOPES.has(s));
}

export function pickerResponseLeaksRefresh(keys: string[]): boolean {
  return keys.some((k) => /refresh/i.test(k));
}

/** Organizer-origin mail must never claim platform Resend as the sender path. */
export function organizerMailUsesPlatformSender(opts: {
  resolveSenderOk: boolean;
  usedPlatformResend: boolean;
}): boolean {
  return opts.resolveSenderOk && opts.usedPlatformResend;
}

export function auditDetailsStripSecrets(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...details };
  for (const key of Object.keys(out)) {
    if (/token|secret|password|cipher|refresh|access/i.test(key)) delete out[key];
  }
  return out;
}

/** Paths that may import Google provider modules (relative under src/). */
export function googleProviderImportAllowed(relativePath: string): boolean {
  const n = relativePath.replace(/\\/g, "/");
  return (
    n.startsWith("features/connections/server/") ||
    n.startsWith("features/connections/providers/") ||
    n.startsWith("features/connections/__tests__/")
  );
}
