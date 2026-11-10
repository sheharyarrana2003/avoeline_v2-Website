import type { ConnectionCapability, ConnectionPublic } from "../types";

export function hasEnabledCapability(
  connection: ConnectionPublic,
  capability: ConnectionCapability,
): boolean {
  return connection.capabilities.some((c) => c.capability === capability && c.enabled);
}

export function findConnectionWithCapability(
  connections: ConnectionPublic[],
  capability: ConnectionCapability,
): ConnectionPublic | undefined {
  return connections.find((c) => c.status === "active" && hasEnabledCapability(c, capability));
}

export function primaryActiveConnection(
  connections: ConnectionPublic[],
): ConnectionPublic | undefined {
  return connections.find((c) => c.status === "active") || connections[0];
}

/** Account chips: Email, Calendar and Meet, Drive (Sheets lives on Sheets card). */
export function accountPermissionChips(connection: ConnectionPublic): Array<{
  id: string;
  label: string;
  enabled: boolean;
}> {
  const email = hasEnabledCapability(connection, "email.send");
  const calendarMeet =
    hasEnabledCapability(connection, "calendar") || hasEnabledCapability(connection, "meet");
  const drive = hasEnabledCapability(connection, "drive.files");
  return [
    { id: "email", label: "Email", enabled: email },
    { id: "calendar-meet", label: "Calendar and Meet", enabled: calendarMeet },
    { id: "drive", label: "Drive", enabled: drive },
  ];
}

export const STATUS_LABEL: Record<string, string> = {
  active: "Connected",
  needs_reconnect: "Needs reconnect",
  blocked_by_admin: "Blocked by admin",
  disabled: "Disabled",
  revoked: "Revoked",
};
