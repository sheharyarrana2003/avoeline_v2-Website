import "server-only";

import {
  classifyOrganizerDriveGmail,
  organizerDriveGmailMessage,
  type OrganizerDriveGmailCode,
} from "../lib/organizerDriveGmailGate.logic";
import { findActiveEmailConnection, listConnections } from "./connections.service";
import { assertGoogleNotKilled } from "./connections.service";

export type OrganizerDriveGmailResult =
  | { ok: true; driveConnectionId: string; emailConnectionId: string }
  | {
      ok: false;
      code: Exclude<OrganizerDriveGmailCode, "OK">;
      error: string;
    };

function hasCap(caps: { capability: string; enabled: boolean }[], name: string): boolean {
  return caps.some((c) => c.capability === name && c.enabled);
}

/**
 * Hard-require active Drive + Gmail for organizer-owned media and registration mail (Phase A).
 */
export async function assertOrganizerDriveAndGmail(
  organizerId: string,
): Promise<OrganizerDriveGmailResult> {
  if (!organizerId) {
    return {
      ok: false,
      code: "NO_BOTH",
      error: organizerDriveGmailMessage("NO_BOTH"),
    };
  }

  const killed = await assertGoogleNotKilled({
    ownerType: "user",
    ownerId: organizerId,
    actorId: organizerId,
  });
  if (!killed.ok) {
    return {
      ok: false,
      code: "NO_BOTH",
      error: killed.error || organizerDriveGmailMessage("NO_BOTH"),
    };
  }

  const list = await listConnections({
    ownerType: "user",
    ownerId: organizerId,
    includeQuota: false,
  });
  const active = list.filter((c) => c.status === "active");
  const drive = active.find((c) => hasCap(c.capabilities, "drive.files"));
  const email =
    (await findActiveEmailConnection({ ownerType: "user", ownerId: organizerId })) ||
    active.find((c) => hasCap(c.capabilities, "email.send"));

  const code = classifyOrganizerDriveGmail({
    hasDrive: Boolean(drive),
    hasGmail: Boolean(email),
  });
  if (code !== "OK" || !drive || !email) {
    const fail = code === "OK" ? "NO_BOTH" : code;
    return { ok: false, code: fail, error: organizerDriveGmailMessage(fail) };
  }

  return {
    ok: true,
    driveConnectionId: drive.id,
    emailConnectionId: email.id,
  };
}

/** Public read for registration UI (no secrets). */
export async function getOrganizerDriveGmailStatus(organizerId: string): Promise<{
  ready: boolean;
  code: OrganizerDriveGmailCode;
  message: string | null;
}> {
  const r = await assertOrganizerDriveAndGmail(organizerId);
  if (r.ok) return { ready: true, code: "OK", message: null };
  return { ready: false, code: r.code, message: r.error };
}
