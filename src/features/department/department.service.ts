import { cache } from "react";
import { redirect } from "next/navigation";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getAuthenticatedUser } from "@/src/features/auth/rbac.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { ALL_MODULE_KEYS, isModuleKey, MODULE_LABELS, type ModuleKey } from "@/src/features/permissions/moduleKeys";
import type { OrgDoc } from "@/src/features/teams/teamEngine.types";
import type { User } from "@/src/services/models/user.type";
import type { NavItem } from "@/src/shared_components/DashboardNav";

export type DepartmentPlan = {
  key: string;
  name: string;
  modules: ModuleKey[];
};

export type ClubOverview = OrgDoc & {
  presidentEmail: string;
  presidentName: string;
  eventCount: number;
  teamCount: number;
  modules: ModuleKey[];
};

export type DeptEventRow = {
  id: string;
  title: string;
  source: "department" | "club";
  clubName: string | null;
  organizerId: string;
};

export async function getClubWorkspacePlan(clubId: string): Promise<DepartmentPlan | null> {
  if (!clubId) return null;
  const club = await TeamEngineService.getOrg(clubId);
  if (!club || club.type !== "club") return null;
  const [modules, deptPlan] = await Promise.all([
    listClubModules(clubId),
    club.parentOrgId ? getDepartmentPlan(club.parentOrgId) : Promise.resolve(null),
  ]);
  return {
    key: deptPlan?.key || "club",
    name: deptPlan ? `${deptPlan.name} (club access)` : "Club access",
    modules,
  };
}

export async function getPlanForOrganizer(userId: string): Promise<DepartmentPlan | null> {
  if (!userId) return null;
  const { clubsLedByUser } = await import("@/src/features/permissions/permissions.service");
  const [{ data: profile }, ledClubs] = await Promise.all([
    supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).select("plan_type, org_id").eq("user_id", userId).maybeSingle(),
    clubsLedByUser(userId),
  ]);
  const key = String(profile?.plan_type || "free");
  const { data: plan } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("key, name, included_modules, is_active")
    .eq("key", key)
    .maybeSingle();
  const personal = ((plan?.included_modules as string[]) ?? []).filter(isModuleKey);

  const clubIds = [...new Set([profile?.org_id ? String(profile.org_id) : "", ...ledClubs].filter(Boolean))];
  if (clubIds.length) {
    const granted = new Set<ModuleKey>();
    let workspace: DepartmentPlan | null = null;
    for (const id of clubIds) {
      const clubPlan = await getClubWorkspacePlan(id);
      if (!clubPlan) continue;
      for (const m of clubPlan.modules) granted.add(m);
      if (!workspace || clubPlan.modules.length >= workspace.modules.length) workspace = clubPlan;
    }
    if (granted.size) {
      return {
        key: workspace?.key || key,
        name: workspace?.name || "Club access",
        modules: [...granted],
      };
    }
  }

  if (!plan) return { key, name: key, modules: personal };
  return { key: plan.key, name: plan.name, modules: personal };
}

export async function getDepartmentPlan(departmentId: string): Promise<DepartmentPlan | null> {
  const { data: org } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("owner_user_id")
    .eq("id", departmentId)
    .maybeSingle();
  if (!org?.owner_user_id) return null;
  const { data: profile } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .select("plan_type")
    .eq("user_id", org.owner_user_id)
    .maybeSingle();
  const key = String(profile?.plan_type || "free");
  const { data: plan } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("key, name, included_modules, is_active")
    .eq("key", key)
    .maybeSingle();
  if (!plan) return { key, name: key, modules: [] };
  return {
    key: plan.key,
    name: plan.name,
    modules: ((plan.included_modules as string[]) ?? []).filter(isModuleKey),
  };
}

export async function listClubModules(clubId: string): Promise<ModuleKey[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.ORG_MODULE_ACCESS)
    .select("module_key, enabled")
    .eq("org_id", clubId)
    .eq("enabled", true);
  return (data ?? []).map((r) => r.module_key).filter(isModuleKey);
}

export const listClubOverviews = cache(async (departmentId: string): Promise<ClubOverview[]> => {
  const clubs = await TeamEngineService.listClubsByDepartment(departmentId);
  if (!clubs.length) return [];

  const ids = clubs.map((c) => c.id);
  const ownerIds = clubs.map((c) => c.ownerUid).filter(Boolean);

  const [{ data: events }, { data: teams }, { data: access }, { data: users }] = await Promise.all([
    supabaseAdmin.from(TABLES.EVENTS).select("id, org_id").in("org_id", ids),
    supabaseAdmin.from(TABLES.TEAMS).select("id, org_id").in("org_id", ids),
    supabaseAdmin.from(TABLES.ORG_MODULE_ACCESS).select("org_id, module_key, enabled").in("org_id", ids).eq("enabled", true),
    ownerIds.length
      ? supabaseAdmin.from(TABLES.USERS).select("id, email, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null; full_name: string | null }[] }),
  ]);

  const eventCount = new Map<string, number>();
  for (const e of events ?? []) eventCount.set(String(e.org_id), (eventCount.get(String(e.org_id)) ?? 0) + 1);
  const teamCount = new Map<string, number>();
  for (const t of teams ?? []) teamCount.set(String(t.org_id), (teamCount.get(String(t.org_id)) ?? 0) + 1);
  const mods = new Map<string, ModuleKey[]>();
  for (const a of access ?? []) {
    if (!isModuleKey(a.module_key)) continue;
    const list = mods.get(String(a.org_id)) ?? [];
    list.push(a.module_key);
    mods.set(String(a.org_id), list);
  }
  const people = new Map((users ?? []).map((u) => [u.id, u]));

  return clubs.map((c) => {
    const person = c.ownerUid ? people.get(c.ownerUid) : undefined;
    return {
      ...c,
      presidentEmail: person?.email || "",
      presidentName: person?.full_name || "",
      eventCount: eventCount.get(c.id) ?? 0,
      teamCount: teamCount.get(c.id) ?? 0,
      modules: mods.get(c.id) ?? [],
    };
  });
});

export async function listScopedEvents(departmentId: string, ownerUserId: string | null): Promise<DeptEventRow[]> {
  const clubs = await TeamEngineService.listClubsByDepartment(departmentId);
  const clubIds = clubs.map((c) => c.id);
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));

  const [own, clubEvents] = await Promise.all([
    ownerUserId
      ? supabaseAdmin.from(TABLES.EVENTS).select("id, title, organizer_id, org_id").eq("organizer_id", ownerUserId)
      : Promise.resolve({ data: [] as { id: string; title: string | null; organizer_id: string; org_id: string | null }[] }),
    clubIds.length
      ? supabaseAdmin.from(TABLES.EVENTS).select("id, title, organizer_id, org_id").in("org_id", clubIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null; organizer_id: string; org_id: string | null }[] }),
  ]);

  const rows: DeptEventRow[] = [];
  const seen = new Set<string>();
  for (const e of own.data ?? []) {
    seen.add(e.id);
    rows.push({
      id: e.id,
      title: e.title || "Untitled event",
      source: "department",
      clubName: null,
      organizerId: e.organizer_id,
    });
  }
  for (const e of clubEvents.data ?? []) {
    if (seen.has(e.id)) continue;
    rows.push({
      id: e.id,
      title: e.title || "Untitled event",
      source: "club",
      clubName: clubName.get(String(e.org_id)) || "Club",
      organizerId: e.organizer_id,
    });
  }
  return rows;
}

export const resolveDepartment = cache(async (orgIdFromUrl?: string): Promise<{
  user: User;
  department: OrgDoc;
  isPlatformAdmin: boolean;
  allDepartments: OrgDoc[];
}> => {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/auth/signin?next=/department");

  const isPlatformAdmin = user.role === "platform_admin" || !!user.isOwner;
  let targetOrgId = orgIdFromUrl || user.orgId;
  let allDepartments: OrgDoc[] = [];

  if (!targetOrgId && !isPlatformAdmin) {
    const owned = (await TeamEngineService.listOrgs("department")).find((d) => d.ownerUid === user.userId);
    if (owned) targetOrgId = owned.id;
  }
  if (isPlatformAdmin) {
    allDepartments = await TeamEngineService.listOrgs("department");
    if (!targetOrgId && allDepartments[0]) targetOrgId = allDepartments[0].id;
  }
  if (!targetOrgId) redirect("/department?missing=1");

  const department = await TeamEngineService.getOrg(targetOrgId);
  if (!department || department.type !== "department") redirect("/department?missing=1");

  if (!isPlatformAdmin) {
    const allowed =
      user.orgId === department.id ||
      user.managedOrgIds?.includes(department.id) ||
      department.ownerUid === user.userId;
    if (!allowed) redirect("/access-denied?reason=unauthorized_department");
  }

  return { user, department, isPlatformAdmin, allDepartments };
});

export function moduleOptions(plan: DepartmentPlan | null) {
  const keys = plan?.modules?.length ? plan.modules : ALL_MODULE_KEYS;
  return keys.map((k) => ({ value: k, label: MODULE_LABELS[k] }));
}

export function departmentNavItems(modules?: readonly ModuleKey[] | null): NavItem[] {
  const store = !!modules?.includes("vendor_store");
  return [
    { label: "Dashboard", href: "/department", icon: "dashboard" },
    { label: "Events", href: "/department/events", icon: "events" },
    { label: "Analytics", href: "/department/analytics", icon: "analytics" },
    ...(store ? [{ label: "Marketplace", href: "/department/marketplace", icon: "vendors" as const }] : []),
    { label: "Clubs", href: "/department/clubs", icon: "clubs" },
    { label: "Announcements", href: "/department/announcements", icon: "announce" },
    { label: "Requests", href: "/department/requests", icon: "requests" },
  ];
}

export async function departmentChrome(user: {
  userId: string;
  orgId?: string;
  name?: string;
  email?: string;
}): Promise<{ name: string; items: NavItem[]; plan: DepartmentPlan | null }> {
  let name = user.name || user.email || "Department";
  if (user.orgId) {
    const org = await TeamEngineService.getOrg(user.orgId);
    if (org?.name) name = org.name;
  }
  const plan = user.orgId ? await getDepartmentPlan(user.orgId) : await getPlanForOrganizer(user.userId);
  return { name, items: departmentNavItems(plan?.modules), plan };
}

/** Organizer list/dashboard chrome must not replace the department rail. */
export function departmentRedirectFromOrganizer(
  pathname: string,
  organizerId: string,
  hasVendorStore: boolean,
): string | null {
  const base = `/organizer/${organizerId}`;
  if (!pathname || pathname === base || pathname === `${base}/` || pathname === `${base}/dashboard`) {
    return "/department";
  }
  if (pathname === `${base}/events`) return "/department/events";
  if (pathname === `${base}/analytics` || pathname.startsWith(`${base}/analytics/`)) {
    return "/department/analytics";
  }
  if (pathname === `${base}/vendor-marketplace` || pathname.startsWith(`${base}/vendor-marketplace/`)) {
    return hasVendorStore ? "/department/marketplace" : "/department";
  }
  if (
    pathname.startsWith(`${base}/designer`) ||
    pathname.startsWith(`${base}/ushers`) ||
    pathname.startsWith(`${base}/profile`) ||
    pathname.startsWith(`${base}/notifications`) ||
    pathname.startsWith(`${base}/chatbot`)
  ) {
    return "/department";
  }
  return null;
}
