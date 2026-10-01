import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { listClubModules } from "@/src/features/department/department.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import type { OrgDoc } from "@/src/features/teams/teamEngine.types";
import type { ModuleKey } from "@/src/features/permissions/moduleKeys";
import type { NavItem } from "@/src/shared_components/DashboardNav";
import type { ClubRequestRow, ClubRosterPerson, ClubTeamCard } from "./types";

export function isClubPresident(
  user: { userId?: string; presidentOfOrgIds?: string[] } | null | undefined,
  club: Pick<OrgDoc, "id" | "ownerUid">,
): boolean {
  if (!user?.userId) return false;
  return user.presidentOfOrgIds?.includes(club.id) || club.ownerUid === user.userId;
}

export function clubNavItems(clubId: string, modules: readonly ModuleKey[], organizerId: string): NavItem[] {
  const has = (key: ModuleKey) => modules.includes(key);
  const base = `/clubs/${clubId}`;
  const orgEvents = `/organizer/${organizerId}/events`;
  return [
    { label: "Dashboard", href: base, icon: "dashboard" },
    ...(has("events_dashboard")
      ? [{ label: "Events", href: `${base}/events`, icon: "events" as const, activePrefix: orgEvents }]
      : []),
    ...(has("analytics_basic") ? [{ label: "Analytics", href: `${base}/analytics`, icon: "analytics" as const }] : []),
    ...(has("vendor_store") ? [{ label: "Marketplace", href: `${base}/marketplace`, icon: "vendors" as const }] : []),
    ...(has("ai_designer") ? [{ label: "Designer", href: `${base}/designer`, icon: "analytics" as const }] : []),
    ...(has("ushers_ops") ? [{ label: "Ushers", href: `${base}/ushers`, icon: "bookings" as const }] : []),
    ...(has("teams_basic") || has("teams_advanced_roles")
      ? [{ label: "Teams", href: `${base}/teams`, icon: "teams" as const }]
      : []),
    { label: "Requests", href: `${base}/requests`, icon: "requests" },
  ];
}

export function clubRedirectFromOrganizer(
  pathname: string,
  organizerId: string,
  clubId: string,
  modules: readonly ModuleKey[],
): string | null {
  const base = `/organizer/${organizerId}`;
  const club = `/clubs/${clubId}`;
  if (!pathname || pathname === base || pathname === `${base}/` || pathname === `${base}/dashboard`) return club;
  if (pathname === `${base}/events`) return `${club}/events`;
  if (pathname === `${base}/hackathon` || pathname === `${base}/hackathon/create`) {
    if (!modules.includes("hackathon_ops")) return club;
    return pathname.endsWith("/create")
      ? `/organizer/${organizerId}/events/create?hackathon=1`
      : `${club}/events?kind=hackathon`;
  }
  if (pathname === `${base}/analytics` || pathname.startsWith(`${base}/analytics/`)) return `${club}/analytics`;
  if (pathname === `${base}/vendor-marketplace` || pathname.startsWith(`${base}/vendor-marketplace/`)) {
    return modules.includes("vendor_store") ? `${club}/marketplace` : club;
  }
  if (pathname.startsWith(`${base}/designer`)) {
    return modules.includes("ai_designer") ? `${club}/designer` : club;
  }
  if (pathname.startsWith(`${base}/ushers`)) {
    return modules.includes("ushers_ops") ? `${club}/ushers` : club;
  }
  return null;
}

/** Keep the organizer profile pointed at the club after a personal organizer is made president. */
export async function syncPresidentOrganizerProfile(userId: string, club: Pick<OrgDoc, "id" | "name">) {
  if (!userId || !club.id) return;
  const { data } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("org_id, org_name, plan_type")
    .eq("user_id", userId)
    .maybeSingle();
  const name = String(club.name || "").trim();
  if (!(data?.org_id === club.id && name && data.org_name === name)) {
    await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert(
      {
        user_id: userId,
        org_id: club.id,
        org_name: name || data?.org_name || "Club",
        plan_type: data?.plan_type || "free",
        review_status: "approved",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }
  await supabaseAdmin
    .from(TABLES.EVENTS)
    .update({ org_id: club.id, updated_at: new Date().toISOString() })
    .eq("organizer_id", userId)
    .is("org_id", null);
}

export async function clubChrome(clubId: string, organizerId: string) {
  const [modules, club] = await Promise.all([listClubModules(clubId), TeamEngineService.getOrg(clubId)]);
  if (organizerId && club) {
    try {
      await syncPresidentOrganizerProfile(organizerId, club);
    } catch (err) {
      console.error("[clubChrome] profile sync", err);
    }
  }
  return {
    name: club?.name || "Club",
    items: clubNavItems(clubId, modules, organizerId),
    modules,
  };
}

export const resolveClub = cache(async (clubId: string): Promise<OrgDoc> => {
  const club = await TeamEngineService.getOrg(clubId);
  if (!club || club.type !== "club") notFound();
  return club;
});

export const requireClubPresident = cache(async (clubId: string) => {
  const [club, user] = await Promise.all([resolveClub(clubId), AuthService.getCurrentUser()]);
  if (!user?.userId) redirect(`/auth/signin?next=/clubs/${clubId}`);
  if (!isClubPresident(user, club)) redirect(`/clubs/${clubId}`);
  return { club, user };
});

function mapRequest(row: Record<string, unknown>): ClubRequestRow {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    title: String(row.title || ""),
    details: String(row.details || ""),
    requestType: (row.request_type as ClubRequestRow["requestType"]) || "other",
    status: (row.status as ClubRequestRow["status"]) || "pending",
    requestedAmount: row.requested_amount == null ? null : Number(row.requested_amount),
    reviewNote: String(row.review_note || ""),
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : null,
    attachmentName: row.attachment_name ? String(row.attachment_name) : null,
    createdAt: String(row.created_at || ""),
  };
}

export async function listClubRequests(clubId: string): Promise<ClubRequestRow[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.ORG_REQUESTS)
    .select(
      "id, org_id, title, details, request_type, status, requested_amount, review_note, attachment_url, attachment_name, created_at",
    )
    .eq("org_id", clubId)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data ?? []).map((row) => mapRequest(row as Record<string, unknown>));
}

export async function listDepartmentRequestQueue(clubIds: string[]): Promise<ClubRequestRow[]> {
  if (!clubIds.length) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.ORG_REQUESTS)
    .select(
      "id, org_id, title, details, request_type, status, requested_amount, review_note, attachment_url, attachment_name, created_at",
    )
    .in("org_id", clubIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => mapRequest(row as Record<string, unknown>));
}

function mapPerson(row: Record<string, unknown>): ClubRosterPerson {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    userId: row.user_id ? String(row.user_id) : null,
    fullName: String(row.full_name || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    memberCode: String(row.member_code || ""),
    designation: String(row.designation || ""),
    isLead: row.is_lead === true,
  };
}

export async function listClubTeams(clubId: string): Promise<ClubTeamCard[]> {
  const teams = await TeamEngineService.getTeamsByContext({ contextType: "club_committee", orgId: clubId });
  if (!teams.length) return [];
  const ids = teams.map((t) => t.id);
  const { data } = await supabaseAdmin.from(TABLES.CLUB_ROSTER).select("*").in("team_id", ids);
  const byTeam = new Map<string, ClubRosterPerson[]>();
  for (const row of data ?? []) {
    const person = mapPerson(row as Record<string, unknown>);
    const list = byTeam.get(person.teamId) ?? [];
    list.push(person);
    byTeam.set(person.teamId, list);
  }
  return teams.map((t) => {
    const people = byTeam.get(t.id) ?? [];
    const lead = people.find((p) => p.isLead);
    return {
      id: t.id,
      name: t.name,
      joinCode: t.joinCode,
      memberCount: people.length,
      leadName: lead?.fullName || "—",
      people,
    };
  });
}

export async function countClubEvents(clubId: string, organizerId?: string): Promise<number> {
  let q = supabaseAdmin.from(TABLES.EVENTS).select("id", { count: "exact", head: true });
  q = organizerId
    ? q.or(`org_id.eq.${clubId},organizer_id.eq.${organizerId}`)
    : q.eq("org_id", clubId);
  const { count } = await q;
  return count ?? 0;
}

export async function listClubEventRows(clubId: string, organizerId?: string) {
  let q = supabaseAdmin
    .from(TABLES.EVENTS)
    .select("id, title, organizer_id, status, start_date, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  q = organizerId
    ? q.or(`org_id.eq.${clubId},organizer_id.eq.${organizerId}`)
    : q.eq("org_id", clubId);
  const { data } = await q;
  return data ?? [];
}
