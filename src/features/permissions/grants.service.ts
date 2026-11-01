import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { normalizePermissionList, type AccessGrantScopeType } from "@/src/lib/permissions";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";

export type ActiveGrant = {
  id: string;
  scopeType: AccessGrantScopeType;
  scopeId: string;
  permissions: string[];
  expiresAt: string | null;
};

function isActive(row: { revoked_at: string | null; expires_at: string | null }): boolean {
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}

export const listActiveGrantsForUser = cache(async (userId: string): Promise<ActiveGrant[]> => {
  if (!userId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.ACCESS_GRANTS)
    .select("id, scope_type, scope_id, permissions, expires_at, revoked_at")
    .eq("grantee_user_id", userId)
    .is("revoked_at", null);
  if (error) throw error;
  return (data ?? []).filter(isActive).map((r) => ({
    id: r.id,
    scopeType: r.scope_type as AccessGrantScopeType,
    scopeId: String(r.scope_id),
    permissions: normalizePermissionList(r.permissions as string[]),
    expiresAt: r.expires_at,
  }));
});

export async function userHasGrantPermission(
  userId: string,
  permission: string,
  scope: { organizerId?: string; orgId?: string; eventId?: string },
): Promise<boolean> {
  const want = permission.trim();
  if (!want) return false;
  const grants = await listActiveGrantsForUser(userId);
  for (const g of grants) {
    if (!g.permissions.includes(want)) continue;
    if (g.scopeType === "organizer" && scope.organizerId && g.scopeId === scope.organizerId) {
      return true;
    }
    if (g.scopeType === "org" && scope.orgId && g.scopeId === scope.orgId) return true;
    if (g.scopeType === "event" && scope.eventId && g.scopeId === scope.eventId) return true;
    // Organizer-scoped grant covers all events owned by that organizer when eventId is set.
    if (
      g.scopeType === "organizer" &&
      scope.eventId &&
      scope.organizerId &&
      g.scopeId === scope.organizerId
    ) {
      return true;
    }
  }
  return false;
}

/** Union of position permissions for memberships relevant to the scope. */
export async function userHasPositionPermission(
  userId: string,
  permission: string,
  scope: { organizerId?: string; orgId?: string; eventId?: string },
): Promise<boolean> {
  const want = permission.trim();
  if (!want || !userId) return false;

  let teamIds: string[] = [];
  if (scope.eventId) {
    teamIds = await TeamEngineService.listStaffTeamIdsForEvent(scope.eventId);
    const assignments = await TeamEngineService.listEventStaffAssignments(scope.eventId);
    const assignedMembers = new Map(assignments.map((a) => [a.teamId, a.memberIds]));

    const { data: memberships } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("id, position_id, team_id")
      .eq("user_id", userId)
      .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

    const onEvent = (memberships ?? []).filter((m) => {
      const subset = assignedMembers.get(String(m.team_id));
      if (!subset || !subset.length) return true;
      return subset.includes(String(m.id));
    });
    const positionIds = [...new Set(onEvent.map((m) => m.position_id).filter(Boolean) as string[])];
    if (!positionIds.length) return false;
    const { data: positions } = await supabaseAdmin
      .from(TABLES.TEAM_POSITIONS)
      .select("permissions")
      .in("id", positionIds);
    return (positions ?? []).some((p) =>
      normalizePermissionList(p.permissions as string[]).includes(want),
    );
  }

  if (scope.organizerId) {
    const docs = await TeamEngineService.listOrganizerStaffTeams(scope.organizerId);
    teamIds = docs.map((t) => t.id);
  } else if (scope.orgId) {
    const { data: teams } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select("id")
      .eq("org_id", scope.orgId)
      .eq("context_type", "club_committee");
    teamIds = (teams ?? []).map((t) => String(t.id));
  }

  if (!teamIds.length) return false;

  const { data: memberships } = await supabaseAdmin
    .from(TABLES.TEAM_MEMBERS)
    .select("position_id")
    .eq("user_id", userId)
    .in("team_id", teamIds);
  const positionIds = [
    ...new Set((memberships ?? []).map((m) => m.position_id).filter(Boolean) as string[]),
  ];
  if (!positionIds.length) return false;

  const { data: positions } = await supabaseAdmin
    .from(TABLES.TEAM_POSITIONS)
    .select("permissions")
    .in("id", positionIds);
  return (positions ?? []).some((p) =>
    normalizePermissionList(p.permissions as string[]).includes(want),
  );
}

export async function createAccessGrant(input: {
  granteeUserId: string;
  scopeType: AccessGrantScopeType;
  scopeId: string;
  permissions: string[];
  grantedBy: string;
  expiresAt?: string | null;
  inviteTokenHash?: string | null;
  inviteSentAt?: string | null;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ACCESS_GRANTS)
    .insert({
      grantee_user_id: input.granteeUserId,
      scope_type: input.scopeType,
      scope_id: input.scopeId,
      permissions: normalizePermissionList(input.permissions),
      granted_by: input.grantedBy,
      expires_at: input.expiresAt ?? null,
      invite_token_hash: input.inviteTokenHash ?? null,
      invite_sent_at: input.inviteSentAt ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateAccessGrant(
  grantId: string,
  patch: {
    permissions?: string[];
    expiresAt?: string | null;
    inviteTokenHash?: string | null;
    inviteSentAt?: string | null;
  },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.permissions) row.permissions = normalizePermissionList(patch.permissions);
  if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt;
  if (patch.inviteTokenHash !== undefined) row.invite_token_hash = patch.inviteTokenHash;
  if (patch.inviteSentAt !== undefined) row.invite_sent_at = patch.inviteSentAt;
  if (!Object.keys(row).length) return;
  const { error } = await supabaseAdmin.from(TABLES.ACCESS_GRANTS).update(row).eq("id", grantId);
  if (error) throw error;
}

export async function revokeAccessGrant(grantId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.ACCESS_GRANTS)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", grantId)
    .is("revoked_at", null);
  if (error) throw error;
}
