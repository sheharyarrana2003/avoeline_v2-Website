import { cache } from "react";
import { redirect } from "next/navigation";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getAuthenticatedUser } from "@/src/features/auth/rbac.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import {
  ALL_MODULE_KEYS,
  isModuleKey,
  MODULE_LABELS,
  type ModuleKey,
} from "@/src/features/permissions/moduleKeys";
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
  logoUrl: string | null;
  status: string;
  currentTenureLabel: string | null;
  currentTenureId: string | null;
};

export type DeptEventRow = {
  id: string;
  title: string;
  source: "department" | "club";
  clubName: string | null;
  clubId: string | null;
  organizerId: string;
  bannerUrl: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  registrations: number;
  tenureId: string | null;
  shortDescription: string | null;
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
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("plan_type, org_id")
      .eq("user_id", userId)
      .maybeSingle(),
    clubsLedByUser(userId),
  ]);
  const key = String(profile?.plan_type || "free");
  const { data: plan } = await supabaseAdmin
    .from(TABLES.SUBSCRIPTION_PLANS)
    .select("key, name, included_modules, is_active")
    .eq("key", key)
    .maybeSingle();
  const personal = ((plan?.included_modules as string[]) ?? []).filter(isModuleKey);

  const clubIds = [
    ...new Set([profile?.org_id ? String(profile.org_id) : "", ...ledClubs].filter(Boolean)),
  ];
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

export type OrganizerFeatureOverrideChip = {
  moduleKey: ModuleKey;
  denied: boolean;
  expiresAt: string | null;
};

/** Plan + expiry + live feature_overrides chips for the organizer profile. */
export async function getOrganizerPlanBlock(userId: string): Promise<{
  plan: DepartmentPlan | null;
  expiresAt: string | null;
  overrides: OrganizerFeatureOverrideChip[];
}> {
  if (!userId) return { plan: null, expiresAt: null, overrides: [] };
  const nowIso = new Date().toISOString();
  const [plan, { data: profile }, { data: overrideRows }] = await Promise.all([
    getPlanForOrganizer(userId),
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("plan_expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from(TABLES.FEATURE_OVERRIDES)
      .select("module_key, denied, expires_at")
      .eq("organizer_id", userId),
  ]);

  const overrides: OrganizerFeatureOverrideChip[] = (overrideRows ?? [])
    .filter((row) => !row.expires_at || String(row.expires_at) > nowIso)
    .filter((row) => isModuleKey(String(row.module_key)))
    .map((row) => ({
      moduleKey: String(row.module_key) as ModuleKey,
      denied: !!row.denied,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
    }));

  return {
    plan,
    expiresAt: profile?.plan_expires_at ? String(profile.plan_expires_at) : null,
    overrides,
  };
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

  const [
    { data: events },
    { data: teams },
    { data: access },
    { data: users },
    { data: tenures },
    { data: orgRows },
  ] = await Promise.all([
    supabaseAdmin.from(TABLES.EVENTS).select("id, org_id").in("org_id", ids),
    supabaseAdmin.from(TABLES.TEAMS).select("id, org_id").in("org_id", ids),
    supabaseAdmin
      .from(TABLES.ORG_MODULE_ACCESS)
      .select("org_id, module_key, enabled")
      .in("org_id", ids)
      .eq("enabled", true),
    ownerIds.length
      ? supabaseAdmin.from(TABLES.USERS).select("id, email, full_name").in("id", ownerIds)
      : Promise.resolve({
          data: [] as { id: string; email: string | null; full_name: string | null }[],
        }),
    supabaseAdmin
      .from(TABLES.ORG_TENURES)
      .select("id, org_id, label, is_current")
      .in("org_id", ids)
      .eq("is_current", true),
    supabaseAdmin.from(TABLES.ORGANIZATIONS).select("id, logo_url, is_verified").in("id", ids),
  ]);

  const eventCount = new Map<string, number>();
  for (const e of events ?? [])
    eventCount.set(String(e.org_id), (eventCount.get(String(e.org_id)) ?? 0) + 1);
  const teamCount = new Map<string, number>();
  for (const t of teams ?? [])
    teamCount.set(String(t.org_id), (teamCount.get(String(t.org_id)) ?? 0) + 1);
  const mods = new Map<string, ModuleKey[]>();
  for (const a of access ?? []) {
    if (!isModuleKey(a.module_key)) continue;
    const list = mods.get(String(a.org_id)) ?? [];
    list.push(a.module_key);
    mods.set(String(a.org_id), list);
  }
  const people = new Map((users ?? []).map((u) => [u.id, u]));
  const tenureByOrg = new Map(
    (tenures ?? []).map((t) => [String(t.org_id), { id: t.id, label: t.label || "" }]),
  );
  const orgMeta = new Map((orgRows ?? []).map((o) => [o.id, o]));

  return clubs.map((c) => {
    const person = c.ownerUid ? people.get(c.ownerUid) : undefined;
    const tenure = tenureByOrg.get(c.id);
    const meta = orgMeta.get(c.id);
    return {
      ...c,
      presidentEmail: person?.email || "",
      presidentName: person?.full_name || "",
      eventCount: eventCount.get(c.id) ?? 0,
      teamCount: teamCount.get(c.id) ?? 0,
      modules: mods.get(c.id) ?? [],
      logoUrl: meta?.logo_url || null,
      status: meta?.is_verified ? "verified" : "active",
      currentTenureLabel: tenure?.label || null,
      currentTenureId: tenure?.id || null,
    };
  });
});

export async function listScopedEvents(
  departmentId: string,
  ownerUserId: string | null,
  scope: string = "all",
): Promise<DeptEventRow[]> {
  const clubs = await TeamEngineService.listClubsByDepartment(departmentId);
  const clubIds = clubs.map((c) => c.id);
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));

  type EvRow = {
    id: string;
    title: string | null;
    organizer_id: string;
    org_id: string | null;
    banner_image: string | null;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    tenure_id: string | null;
    short_description: string | null;
    registrations_count: number | null;
  };
  const select =
    "id, title, organizer_id, org_id, banner_image, status, start_date, end_date, start_time, tenure_id, short_description, registrations_count";

  const [own, clubEvents] = await Promise.all([
    ownerUserId && (scope === "all" || scope === "department")
      ? supabaseAdmin.from(TABLES.EVENTS).select(select).eq("organizer_id", ownerUserId)
      : Promise.resolve({ data: [] as EvRow[] }),
    clubIds.length && (scope === "all" || (scope !== "department" && clubIds.includes(scope)))
      ? supabaseAdmin
          .from(TABLES.EVENTS)
          .select(select)
          .in("org_id", scope === "all" ? clubIds : [scope])
      : Promise.resolve({ data: [] as EvRow[] }),
  ]);

  const toRow = (e: EvRow, source: "department" | "club"): DeptEventRow => ({
    id: e.id,
    title: e.title || "Untitled event",
    source,
    clubName: source === "club" ? clubName.get(String(e.org_id)) || "Club" : null,
    clubId: source === "club" ? String(e.org_id) : null,
    organizerId: e.organizer_id,
    bannerUrl: e.banner_image || null,
    status: e.status,
    startDate: e.start_date,
    endDate: e.end_date,
    startTime: e.start_time,
    registrations: Number(e.registrations_count) || 0,
    tenureId: e.tenure_id,
    shortDescription: e.short_description,
  });

  const rows: DeptEventRow[] = [];
  const seen = new Set<string>();
  if (scope === "all" || scope === "department") {
    for (const e of own.data ?? []) {
      // Department-owned: organizer is dept admin and org is not a club (or null).
      if (e.org_id && clubIds.includes(String(e.org_id))) continue;
      seen.add(e.id);
      rows.push(toRow(e, "department"));
    }
  }
  if (scope === "all" || (scope !== "department" && clubIds.includes(scope))) {
    for (const e of clubEvents.data ?? []) {
      if (seen.has(e.id)) continue;
      rows.push(toRow(e, "club"));
    }
  }
  return rows;
}

export async function listTenuresForOrg(orgId: string) {
  if (!orgId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.ORG_TENURES)
    .select("id, org_id, label, start_date, end_date, is_current")
    .eq("org_id", orgId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    orgId: t.org_id,
    label: t.label,
    startDate: t.start_date,
    endDate: t.end_date,
    isCurrent: !!t.is_current,
  }));
}

export async function getCurrentTenureId(clubId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.ORG_TENURES)
    .select("id")
    .eq("org_id", clubId)
    .eq("is_current", true)
    .maybeSingle();
  return data?.id ?? null;
}

export const resolveDepartment = cache(
  async (
    orgIdFromUrl?: string,
  ): Promise<{
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
      const owned = (await TeamEngineService.listOrgs("department")).find(
        (d) => d.ownerUid === user.userId,
      );
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
  },
);

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
    ...(store
      ? [{ label: "Marketplace", href: "/department/marketplace", icon: "vendors" as const }]
      : []),
    { label: "Clubs", href: "/department/clubs", icon: "clubs" },
    { label: "Tenures", href: "/department/tenures", icon: "clubs" },
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
  const plan = user.orgId
    ? await getDepartmentPlan(user.orgId)
    : await getPlanForOrganizer(user.userId);
  return { name, items: departmentNavItems(plan?.modules), plan };
}

/** Organizer list/dashboard chrome must not replace the department rail. */
export function departmentRedirectFromOrganizer(
  pathname: string,
  organizerId: string,
  hasVendorStore: boolean,
): string | null {
  const base = `/organizer/${organizerId}`;
  if (
    !pathname ||
    pathname === base ||
    pathname === `${base}/` ||
    pathname === `${base}/dashboard`
  ) {
    return "/department";
  }
  if (pathname === `${base}/events`) return "/department/events";
  if (pathname === `${base}/analytics` || pathname.startsWith(`${base}/analytics/`)) {
    return "/department/analytics";
  }
  if (
    pathname === `${base}/vendor-marketplace` ||
    pathname.startsWith(`${base}/vendor-marketplace/`)
  ) {
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
