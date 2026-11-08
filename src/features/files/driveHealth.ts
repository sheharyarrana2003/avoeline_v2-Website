import "server-only";

import { listConnections } from "@/src/features/connections/server/connections.service";
import { countNeedsPromote } from "./storedFiles.repo";
import type { DriveHealthSnapshot, DriveHealthStatus } from "./types";

function hasCap(caps: { capability: string; enabled: boolean }[], name: string): boolean {
  return caps.some((c) => c.capability === name && c.enabled);
}

/**
 * Derive Drive health for organizer UI banners.
 */
export async function getOrganizerDriveHealth(
  organizerId: string,
  eventId?: string,
): Promise<DriveHealthSnapshot> {
  const needsPromoteCount = await countNeedsPromote(eventId).catch(() => 0);

  if (!organizerId) {
    return {
      status: "blocked",
      message: "Connect Google Drive in Connections to store event files.",
      needsPromoteCount,
      connectionId: null,
    };
  }

  const list = await listConnections({
    ownerType: "user",
    ownerId: organizerId,
    includeQuota: false,
  });
  const drive = list.find((c) => hasCap(c.capabilities, "drive.files"));

  if (!drive) {
    return {
      status: "blocked",
      message: "Connect Google Drive in Connections to store event files.",
      needsPromoteCount,
      connectionId: null,
    };
  }

  let status: DriveHealthStatus = "active";
  let message: string | null = null;

  if (drive.status === "needs_reconnect" || drive.status === "revoked") {
    status = "needs_reconnect";
    message = "Google Drive needs to be reconnected before new uploads go to Drive.";
  } else if (drive.status === "blocked_by_admin" || drive.status === "disabled") {
    status = "blocked";
    message = "Google Drive is blocked. Check Connections or contact support.";
  } else if (drive.status !== "active") {
    status = "blocked";
    message = "Google Drive is not active. Check Connections.";
  } else if (
    drive.quotaExhaustedUntil &&
    new Date(drive.quotaExhaustedUntil).getTime() > Date.now()
  ) {
    status = "full";
    message =
      "Google Drive quota is exhausted. New files may use secure fallback storage temporarily.";
  } else if (drive.lastError && /storage|quota|full/i.test(drive.lastError)) {
    status = "full";
    message = "Google Drive reported a storage problem. New files may use secure fallback storage.";
  }

  if (needsPromoteCount > 0) {
    const fallbackMsg = `Temporarily storing ${needsPromoteCount} file(s) in secure fallback…`;
    if (status === "active") {
      message = fallbackMsg;
    } else if (!message) {
      message = fallbackMsg;
    }
  }

  return {
    status,
    message,
    needsPromoteCount,
    connectionId: drive.id,
  };
}

export function driveHealthBannerCopy(snapshot: DriveHealthSnapshot): string | null {
  if (snapshot.status === "active" && snapshot.needsPromoteCount === 0) return null;
  return snapshot.message;
}
