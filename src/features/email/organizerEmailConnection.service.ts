import "server-only";

/**
 * Thin compatibility layer over Connections C1.
 * Other features should prefer `@/src/features/connections` services.
 * No direct Google API calls here.
 */

import {
  findActiveEmailConnection,
  googleConnectionsConfigured,
  listConnections,
} from "@/src/features/connections/server/connections.service";
import type {
  EmailConnectionCreatedBy,
  EmailConnectionProvider,
  EmailConnectionStatus,
  OrganizerEmailConnectionPublic,
} from "@/src/features/email/types";

function mapStatus(status: string): EmailConnectionStatus {
  if (status === "active") return "active";
  if (status === "revoked") return "revoked";
  return "error";
}

export async function getOrganizerEmailConnection(
  organizerId: string,
): Promise<OrganizerEmailConnectionPublic | null> {
  const list = await listConnections({ ownerType: "user", ownerId: organizerId });
  const row =
    list.find((c) => c.status === "active") ||
    list.find((c) => c.status === "needs_reconnect") ||
    list[0];
  if (!row) return null;
  const emailCap = row.capabilities.find((c) => c.capability === "email.send");
  const settings = (emailCap?.settings || {}) as { from_email?: string; from_name?: string };
  return {
    id: row.id,
    organizerId,
    provider: "google" as EmailConnectionProvider,
    fromEmail: settings.from_email || row.providerEmail,
    fromName: settings.from_name || row.displayName,
    status: mapStatus(row.status),
    createdBy: "self" as EmailConnectionCreatedBy,
    googleAccountEmail: row.providerEmail,
    smtpHost: null,
    lastError: row.lastError,
    lastTestedAt: row.lastUsedAt,
    updatedAt: row.connectedAt,
  };
}

export async function hasActiveOrganizerEmailConnection(organizerId: string): Promise<boolean> {
  const active = await findActiveEmailConnection({
    ownerType: "user",
    ownerId: organizerId,
  });
  return Boolean(active);
}

export function googleOAuthConfigured(): boolean {
  return googleConnectionsConfigured();
}

/** @deprecated Use connections startOAuthConnect */
export function buildGoogleAuthUrl(_state: string, _loginHint?: string): string | null {
  return null;
}

export async function revokeOrganizerEmailConnection(organizerId: string): Promise<void> {
  const { disconnectConnection } =
    await import("@/src/features/connections/server/connections.service");
  const list = await listConnections({ ownerType: "user", ownerId: organizerId });
  for (const c of list) {
    await disconnectConnection({ connectionId: c.id, actorId: organizerId });
  }
}
