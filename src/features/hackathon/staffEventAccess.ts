import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { EventService } from "@/src/services/event.service";
import type { HackathonTrack } from "@/src/features/hackathon/types";
import { TAB_PERMISSION, normalizePermissionList } from "@/src/lib/permissions";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { can } from "@/src/features/permissions/can";

export type StaffEventGrant = {
  isOwner: boolean;
  isStaff: boolean;
  pages: Set<string>;
  /** null = every track */
  trackIds: string[] | null;
};

function extraTrackIds(extra: unknown): string[] {
  if (!extra || typeof extra !== "object") return [];
  const raw = (extra as { trackIds?: unknown }).trackIds;
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

export const getStaffEventGrant = cache(async (eventId: string): Promise<StaffEventGrant> => {
  const empty: StaffEventGrant = {
    isOwner: false,
    isStaff: false,
    pages: new Set(),
    trackIds: null,
  };
  const current = await AuthService.getCurrentUser().catch(() => null);
  if (!current?.userId) return empty;
  const event = await EventService.getEventByID(eventId);
  if (!event) return empty;

  const asAdmin =
    current.role === "platform_admin" || String(current.userType).trim().toLowerCase() === "admin";
  if (asAdmin || String(event.organizerId) === current.userId) {
    return {
      isOwner: true,
      isStaff: false,
      pages: new Set(Object.values(TAB_PERMISSION).filter(Boolean) as string[]),
      trackIds: null,
    };
  }

  const teamIds = await TeamEngineService.listStaffTeamIdsForEvent(eventId);
  if (!teamIds.length) return empty;

  const assignments = await TeamEngineService.listEventStaffAssignments(eventId);
  const assignedMembers = new Map(assignments.map((a) => [a.teamId, a.memberIds]));

  const { data: memberships } = await supabaseAdmin
    .from(TABLES.TEAM_MEMBERS)
    .select("id, position_id, team_id")
    .eq("user_id", current.userId)
    .in("team_id", teamIds);
  const onThisEvent = (memberships ?? []).filter((m) => {
    const subset = assignedMembers.get(String(m.team_id));
    if (!subset || !subset.length) return true;
    return subset.includes(String(m.id));
  });
  const positionIds = [
    ...new Set(onThisEvent.map((m) => m.position_id).filter(Boolean) as string[]),
  ];
  if (!positionIds.length) return empty;

  const { data: positions } = await supabaseAdmin
    .from(TABLES.TEAM_POSITIONS)
    .select("permissions, extra")
    .in("id", positionIds);

  const pages = new Set<string>();
  const tracks = new Set<string>();
  let scoped = false;
  for (const p of positions ?? []) {
    for (const key of normalizePermissionList(p.permissions as string[])) pages.add(key);
    const ids = extraTrackIds(p.extra);
    if (ids.length) {
      scoped = true;
      ids.forEach((id) => tracks.add(id));
    }
  }
  return {
    isOwner: false,
    isStaff: true,
    pages,
    trackIds: scoped ? [...tracks] : null,
  };
});

export function tabAllowedByGrant(grant: StaffEventGrant, tabValue: string): boolean {
  if (grant.isOwner) return true;
  if (!grant.isStaff) return true;
  const required = TAB_PERMISSION[tabValue];
  if (!required) return true;
  return grant.pages.has(required);
}

export async function staffMayOpenTab(eventId: string, tabValue: string): Promise<boolean> {
  const current = await AuthService.getCurrentUser().catch(() => null);
  if (!current) return false;
  const grant = await getStaffEventGrant(eventId);
  if (grant.isOwner) return true;
  // Position page_* / catalog keys (normalized into grant.pages) must open the tab
  // even when access_grants are empty — do not rely on can() alone.
  if (grant.isStaff && tabAllowedByGrant(grant, tabValue)) return true;
  const required = TAB_PERMISSION[tabValue];
  if (!required) return false;
  return can(current, required, { eventId, organizerId: undefined });
}

export async function staffMayTouchTrack(eventId: string, trackId: string): Promise<boolean> {
  const grant = await getStaffEventGrant(eventId);
  if (grant.isOwner || !grant.isStaff || !grant.trackIds) return true;
  return grant.trackIds.includes(trackId);
}

export async function staffCanAct(
  eventId: string,
  tab: string,
  trackId?: string | null,
): Promise<boolean> {
  if (!(await staffMayOpenTab(eventId, tab))) return false;
  if (trackId && !(await staffMayTouchTrack(eventId, trackId))) return false;
  return true;
}

export function eventTabFromPath(pathname: string, eventId: string): string {
  const needle = `/events/${eventId}`;
  const i = pathname.indexOf(needle);
  if (i < 0) return "overview";
  const rest = pathname.slice(i + needle.length).split("?")[0];
  const seg = rest.replace(/^\//, "").split("/")[0];
  return seg || "overview";
}

export async function filterTracksForViewer(
  eventId: string,
  _organizerId: string,
  tracks: HackathonTrack[],
): Promise<HackathonTrack[]> {
  const grant = await getStaffEventGrant(eventId);
  if (grant.isOwner || !grant.isStaff || !grant.trackIds) return tracks;
  const allowed = new Set(grant.trackIds);
  return tracks.filter((t) => allowed.has(t.id));
}

export async function userIsEventStaff(userId: string, eventId: string): Promise<boolean> {
  const teamIds = await TeamEngineService.listStaffTeamIdsForEvent(eventId);
  if (!teamIds.length) return false;

  const assignments = await TeamEngineService.listEventStaffAssignments(eventId);
  const assignedMembers = new Map(assignments.map((a) => [a.teamId, a.memberIds]));

  const { data: memberships } = await supabaseAdmin
    .from(TABLES.TEAM_MEMBERS)
    .select("id, team_id")
    .eq("user_id", userId)
    .in("team_id", teamIds);
  if (!memberships?.length) return false;

  return memberships.some((m) => {
    const subset = assignedMembers.get(String(m.team_id));
    if (!subset || !subset.length) return true;
    return subset.includes(String(m.id));
  });
}
