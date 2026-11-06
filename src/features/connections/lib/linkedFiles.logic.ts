/** Pure Drive / linked_files helpers (unit-testable). */

export type LinkedFileAccessStatus = "ok" | "missing" | "no_access";

export function mayUseDriveFiles(opts: {
  hasDriveCapability: boolean;
  isOwner: boolean;
  hasGrant: boolean;
}): boolean {
  if (!opts.hasDriveCapability) return false;
  return opts.isOwner || opts.hasGrant;
}

export function mapDriveHttpToStatus(httpStatus: number): LinkedFileAccessStatus {
  if (httpStatus === 200 || httpStatus === 204) return "ok";
  if (httpStatus === 404) return "missing";
  return "no_access";
}

/** Unlink only removes the platform row — never deletes the Drive file. */
export function unlinkAffectsDriveFile(): false {
  return false;
}

const PICKER_TOKEN_KEYS = ["accessToken", "expiresIn", "apiKey", "appId", "clientId"] as const;

export type PickerTokenPublic = {
  accessToken: string;
  expiresIn: number;
  apiKey: string;
  appId: string;
  clientId: string;
};

/** Ensure picker responses never leak refresh-token shaped fields. */
export function sanitizePickerTokenResponse(
  raw: Record<string, unknown>,
): PickerTokenPublic | { error: string } {
  for (const key of Object.keys(raw)) {
    const lower = key.toLowerCase();
    if (lower.includes("refresh") || lower === "encrypted_refresh_token") {
      return { error: "refresh token must not be returned" };
    }
  }
  const out: Record<string, unknown> = {};
  for (const k of PICKER_TOKEN_KEYS) {
    if (!(k in raw)) return { error: `missing ${k}` };
    out[k] = raw[k];
  }
  if (typeof out.accessToken !== "string" || !out.accessToken) {
    return { error: "invalid accessToken" };
  }
  if (typeof out.expiresIn !== "number") return { error: "invalid expiresIn" };
  return out as PickerTokenPublic;
}

export function mimeLabel(mimeType: string): string {
  if (mimeType.includes("document")) return "Doc";
  if (mimeType.includes("spreadsheet")) return "Sheet";
  if (mimeType.includes("presentation")) return "Slides";
  if (mimeType.includes("folder")) return "Folder";
  return "File";
}

/** Idempotent upsert identity for linked_files unique key. */
export function linkedFileUniqueKey(
  connectionId: string,
  providerFileId: string,
  entityType: string,
  entityId: string,
): string {
  return `${connectionId}|${providerFileId}|${entityType}|${entityId}`;
}

/** Only provider file ids present in linked_files may be opened via the platform. */
export function isAccessibleProviderFileId(
  providerFileId: string,
  linkedProviderIds: Iterable<string>,
): boolean {
  const set = linkedProviderIds instanceof Set ? linkedProviderIds : new Set(linkedProviderIds);
  return set.has(providerFileId);
}

export type OpenAfterVerify = { allow: true } | { allow: false; reason: string };

/** Gate “Open in Google” after a fresh verify. */
export function gateOpenAfterVerify(status: LinkedFileAccessStatus): OpenAfterVerify {
  if (status === "ok") return { allow: true };
  if (status === "missing") {
    return {
      allow: false,
      reason: "This file is missing in Google Drive. Unlink it or pick another file.",
    };
  }
  return {
    allow: false,
    reason:
      "No access to this file. Reconnect Google Drive under Connections, or ask the owner to share it with the connected account.",
  };
}

export type MimeFamily = "doc" | "sheet" | "slides" | "other";

export function mimeFamily(mimeType: string): MimeFamily {
  if (mimeType.includes("document")) return "doc";
  if (mimeType.includes("spreadsheet")) return "sheet";
  if (mimeType.includes("presentation")) return "slides";
  return "other";
}

export function mimeContainsForFamily(family: MimeFamily | ""): string | undefined {
  if (family === "doc") return "document";
  if (family === "sheet") return "spreadsheet";
  if (family === "slides") return "presentation";
  return undefined;
}
