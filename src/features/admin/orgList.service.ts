import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { accountIsLive } from "./types";

export type OrgListDepartment = {
  id: string;
  name: string;
  logoUrl: string;
  ownerUserId: string | null;
  contactEmail: string;
  adminEmail: string;
  accountStatus: string;
  planKey: string;
  planName: string;
  clubsCount: number;
  eventsCount: number;
  createdAt: string;
  /** Approx Auth logins removed if this department is purged (owner + club owners). */
  loginsCount: number;
};

export type OrgListClub = {
  id: string;
  name: string;
  logoUrl: string;
  parentOrgId: string | null;
  parentName: string;
  presidentName: string;
  presidentEmail: string;
  currentTenureLabel: string;
  eventsCount: number;
  status: string;
  ownerUserId: string | null;
  accountStatus: string;
};

export type OrgListMetrics = {
  departmentsCount: number;
  clubsCount: number;
  activeCount: number;
  suspendedCount: number;
};

export type OrgListPlanOption = { key: string; name: string };

export type OrgListBundle = {
  departments: OrgListDepartment[];
  clubs: OrgListClub[];
  metrics: OrgListMetrics;
  plans: OrgListPlanOption[];
};

type OrgRow = {
  id: string;
  name: string;
  org_type: string;
  parent_org_id: string | null;
  owner_user_id: string | null;
  contact_email: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  created_at: string | null;
};

const ORG_LIST_COLS =
  "id, name, org_type, parent_org_id, owner_user_id, contact_email, logo_url, is_verified, created_at";

function clubStatus(accountStatus: string, isVerified: boolean): string {
  if (accountStatus === "suspended" || accountStatus === "deactivated") return accountStatus;
  if (isVerified) return "verified";
  return "active";
}

export async function getOrgListBundle(): Promise<OrgListBundle> {
  const [{ data: orgRows }, { data: planRows }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select(ORG_LIST_COLS)
      .in("org_type", ["department", "club"])
      .order("name"),
    supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("key, name, is_active")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const orgs = (orgRows ?? []) as OrgRow[];
  const departmentsRaw = orgs.filter((o) => o.org_type === "department");
  const clubsRaw = orgs.filter((o) => o.org_type === "club");
  const deptIds = departmentsRaw.map((d) => d.id);
  const clubIds = clubsRaw.map((c) => c.id);
  const allOrgIds = [...deptIds, ...clubIds];
  const ownerIds = [
    ...new Set(orgs.map((o) => o.owner_user_id).filter((id): id is string => Boolean(id))),
  ];

  const [{ data: users }, { data: profiles }, { data: events }, { data: tenures }] =
    await Promise.all([
      ownerIds.length
        ? supabaseAdmin
            .from(TABLES.USERS)
            .select("id, email, full_name, account_status")
            .in("id", ownerIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              email: string | null;
              full_name: string | null;
              account_status: string | null;
            }[],
          }),
      ownerIds.length
        ? supabaseAdmin
            .from(TABLES.ORGANIZER_PROFILES)
            .select("user_id, plan_type")
            .in("user_id", ownerIds)
        : Promise.resolve({ data: [] as { user_id: string; plan_type: string | null }[] }),
      allOrgIds.length
        ? supabaseAdmin.from(TABLES.EVENTS).select("id, org_id").in("org_id", allOrgIds)
        : Promise.resolve({ data: [] as { id: string; org_id: string | null }[] }),
      clubIds.length
        ? supabaseAdmin
            .from(TABLES.ORG_TENURES)
            .select("org_id, label, is_current")
            .in("org_id", clubIds)
            .eq("is_current", true)
        : Promise.resolve({
            data: [] as { org_id: string; label: string | null; is_current: boolean | null }[],
          }),
    ]);

  const userById = new Map(
    (users ?? []).map((u) => [
      String(u.id),
      {
        email: String(u.email || ""),
        fullName: String(u.full_name || ""),
        accountStatus: String(u.account_status || "active"),
      },
    ]),
  );
  const planKeyByOwner = new Map(
    (profiles ?? []).map((p) => [String(p.user_id), String(p.plan_type || "free")]),
  );
  const planNameByKey = new Map(
    (planRows ?? []).map((p) => [String(p.key), String(p.name || p.key)]),
  );
  const plans: OrgListPlanOption[] = (planRows ?? []).map((p) => ({
    key: String(p.key),
    name: String(p.name || p.key),
  }));

  const eventCount = new Map<string, number>();
  for (const e of events ?? []) {
    const oid = String(e.org_id || "");
    if (!oid) continue;
    eventCount.set(oid, (eventCount.get(oid) ?? 0) + 1);
  }

  const clubsByParent = new Map<string, OrgRow[]>();
  for (const club of clubsRaw) {
    const parent = club.parent_org_id ? String(club.parent_org_id) : "";
    if (!parent) continue;
    const list = clubsByParent.get(parent) ?? [];
    list.push(club);
    clubsByParent.set(parent, list);
  }

  const tenureByOrg = new Map(
    (tenures ?? []).map((t) => [String(t.org_id), String(t.label || "")]),
  );

  const deptNameById = new Map(departmentsRaw.map((d) => [d.id, d.name]));

  const departments: OrgListDepartment[] = departmentsRaw.map((d) => {
    const ownerId = d.owner_user_id ? String(d.owner_user_id) : null;
    const owner = ownerId ? userById.get(ownerId) : undefined;
    const planKey = ownerId ? planKeyByOwner.get(ownerId) || "free" : "free";
    const childClubs = clubsByParent.get(d.id) ?? [];
    const loginIds = new Set<string>();
    if (ownerId) loginIds.add(ownerId);
    for (const c of childClubs) {
      if (c.owner_user_id) loginIds.add(String(c.owner_user_id));
    }
    return {
      id: d.id,
      name: d.name,
      logoUrl: String(d.logo_url || ""),
      ownerUserId: ownerId,
      contactEmail: String(d.contact_email || ""),
      adminEmail: owner?.email || String(d.contact_email || ""),
      accountStatus: owner?.accountStatus || "active",
      planKey,
      planName: planNameByKey.get(planKey) || planKey,
      clubsCount: childClubs.length,
      eventsCount: eventCount.get(d.id) ?? 0,
      createdAt: String(d.created_at || ""),
      loginsCount: loginIds.size,
    };
  });

  const clubs: OrgListClub[] = clubsRaw.map((c) => {
    const ownerId = c.owner_user_id ? String(c.owner_user_id) : null;
    const owner = ownerId ? userById.get(ownerId) : undefined;
    const accountStatus = owner?.accountStatus || "active";
    const parentOrgId = c.parent_org_id ? String(c.parent_org_id) : null;
    return {
      id: c.id,
      name: c.name,
      logoUrl: String(c.logo_url || ""),
      parentOrgId,
      parentName: parentOrgId ? deptNameById.get(parentOrgId) || "—" : "—",
      presidentName: owner?.fullName || "",
      presidentEmail: owner?.email || "",
      currentTenureLabel: tenureByOrg.get(c.id) || "",
      eventsCount: eventCount.get(c.id) ?? 0,
      status: clubStatus(accountStatus, Boolean(c.is_verified)),
      ownerUserId: ownerId,
      accountStatus,
    };
  });

  let activeCount = 0;
  let suspendedCount = 0;
  for (const d of departments) {
    if (accountIsLive(d.accountStatus)) activeCount += 1;
    else suspendedCount += 1;
  }
  for (const c of clubs) {
    if (accountIsLive(c.accountStatus)) activeCount += 1;
    else suspendedCount += 1;
  }

  return {
    departments,
    clubs,
    metrics: {
      departmentsCount: departments.length,
      clubsCount: clubs.length,
      activeCount,
      suspendedCount,
    },
    plans,
  };
}
