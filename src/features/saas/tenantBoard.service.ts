import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { AdminIdentity } from "@/src/features/admin/types";
import { canTenantCap } from "@/src/features/admin/types";
import {
  PAGE_SIZE,
  type TenantBoardBundle,
  type TenantBoardCard,
  type TenantBoardFilters,
  type TenantType,
} from "./tenantBoard.types";

const EXPIRING_SOON_DAYS = 14;

function initialsName(name: string): string {
  return name.trim() || "Account";
}

function inBatches<T>(ids: string[], run: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return Promise.resolve([]);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 80) chunks.push(unique.slice(i, i + 80));
  return Promise.all(chunks.map(run)).then((parts) => parts.flat());
}

async function countByOwner(
  table: string,
  ownerCol: string,
  ownerIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!ownerIds.length) return map;
  const rows = await inBatches(ownerIds, async (chunk) => {
    const { data } = await supabaseAdmin.from(table).select(ownerCol).in(ownerCol, chunk);
    return (data ?? []) as unknown as Record<string, string>[];
  });
  for (const row of rows) {
    const id = String(row[ownerCol] ?? "");
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function getTenantBoardBundle(
  filters: TenantBoardFilters,
  admin: AdminIdentity,
): Promise<TenantBoardBundle> {
  const caps = {
    create: canTenantCap(admin, "tenants:create"),
    changePlan: canTenantCap(admin, "plans:change"),
    grants: canTenantCap(admin, "grants:manage"),
    pricing: canTenantCap(admin, "pricing:manage"),
    approvals: canTenantCap(admin, "approvals:manage"),
  };

  const [
    plansRes,
    institutesRes,
    clubsRes,
    orgProfiles,
    vendorProfiles,
    deptOrgs,
    pendingOrgs,
    pendingVendors,
    pendingOrganizers,
    overridesRes,
    pricingRes,
    moderationRes,
    emailLogRes,
  ] = await Promise.all([
    supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select("key, name, audience, included_modules, is_active")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin.from(TABLES.INSTITUTES).select("id, name").order("name").limit(200),
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("id, name, parent_org_id")
      .eq("org_type", "club")
      .limit(500),
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("user_id, org_name, plan_type, review_status, org_id, plan_expires_at")
      .limit(500),
    supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("user_id, business_name, business_email, status, plan_type")
      .limit(500),
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select(
        "id, name, contact_email, owner_user_id, institute_id, is_verified, created_at, org_type",
      )
      .eq("org_type", "department")
      .limit(300),
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("id, name, org_type, contact_email, created_at, is_verified")
      .eq("is_verified", false)
      .in("org_type", ["department", "club"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("user_id, business_name, business_email, status, created_at")
      .eq("status", "pending")
      .limit(50),
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("user_id, org_name, review_status, plan_type")
      .in("review_status", ["pending", "flagged"])
      .limit(50),
    supabaseAdmin
      .from(TABLES.FEATURE_OVERRIDES)
      .select("id, organizer_id, target_org_id, module_key, denied, reason, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from(TABLES.CUSTOM_PRICING_AGREEMENTS)
      .select("id, organizer_id, discount_pct, flat_monthly_override, notes, active, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from(TABLES.MODERATION_LOGS)
      .select("id, action, target_type, target_label, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabaseAdmin
      .from(TABLES.EMAIL_LOG)
      .select("id, kind, recipient, subject, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const plans = (plansRes.data ?? []).map((p) => ({
    key: String(p.key),
    name: String(p.name),
    audience: p.audience ? String(p.audience) : null,
    includedModules: Array.isArray(p.included_modules) ? p.included_modules.map(String) : [],
  }));
  const planName = new Map(plans.map((p) => [p.key, p.name]));

  const institutes = (institutesRes.data ?? []).map((i) => ({
    id: String(i.id),
    name: String(i.name),
  }));
  const instituteById = new Map(institutes.map((i) => [i.id, i.name]));

  const clubs = (clubsRes.data ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    parentId: c.parent_org_id ? String(c.parent_org_id) : null,
  }));

  const deptRows = deptOrgs.data ?? [];
  const orgProfilesRows = orgProfiles.data ?? [];
  const vendorRows = vendorProfiles.data ?? [];

  const deptOwnerIds = deptRows.map((d) => String(d.owner_user_id || "")).filter(Boolean);
  const organizerIds = orgProfilesRows.map((o) => String(o.user_id));
  const vendorIds = vendorRows.map((v) => String(v.user_id));
  const allUserIds = [...new Set([...deptOwnerIds, ...organizerIds, ...vendorIds])];

  const [users, eventCounts, bookingCounts, clubCountsByParent] = await Promise.all([
    inBatches(allUserIds, async (chunk) => {
      const { data } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("id, email, full_name, avatar_url, account_status, created_at")
        .in("id", chunk);
      return data ?? [];
    }),
    countByOwner(TABLES.EVENTS, "organizer_id", organizerIds),
    countByOwner(TABLES.BOOKINGS, "vendor_id", vendorIds),
    (async () => {
      const map = new Map<string, number>();
      for (const c of clubs) {
        if (!c.parentId) continue;
        map.set(c.parentId, (map.get(c.parentId) ?? 0) + 1);
      }
      return map;
    })(),
  ]);

  const userById = new Map(users.map((u) => [String(u.id), u]));

  const overrides = overridesRes.data ?? [];
  const grantsByOrganizer = new Map<string, typeof overrides>();
  const deniesByOrganizer = new Map<string, typeof overrides>();
  const grantsByOrg = new Map<string, typeof overrides>();
  const deniesByOrg = new Map<string, typeof overrides>();
  for (const o of overrides) {
    if (o.target_org_id && !o.organizer_id) {
      const map = o.denied ? deniesByOrg : grantsByOrg;
      const key = String(o.target_org_id);
      const list = map.get(key) ?? [];
      list.push(o);
      map.set(key, list);
    } else if (o.organizer_id) {
      const map = o.denied ? deniesByOrganizer : grantsByOrganizer;
      const key = String(o.organizer_id);
      const list = map.get(key) ?? [];
      list.push(o);
      map.set(key, list);
    }
  }

  const pricingActive = new Set(
    (pricingRes.data ?? []).filter((p) => p.active).map((p) => String(p.organizer_id)),
  );

  const soon = Date.now() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

  const cards: TenantBoardCard[] = [];

  // Department cards (owner login)
  for (const d of deptRows) {
    const ownerId = String(d.owner_user_id || "");
    const user = ownerId ? userById.get(ownerId) : undefined;
    const profile = orgProfilesRows.find(
      (p) => String(p.org_id) === String(d.id) || String(p.user_id) === ownerId,
    );
    const planKey = String(profile?.plan_type || "free");
    const orgGrants = grantsByOrg.get(String(d.id)) ?? [];
    const orgDenies = deniesByOrg.get(String(d.id)) ?? [];
    const userGrants = ownerId ? (grantsByOrganizer.get(ownerId) ?? []) : [];
    const userDenies = ownerId ? (deniesByOrganizer.get(ownerId) ?? []) : [];
    const allOverrides = [...orgGrants, ...orgDenies, ...userGrants, ...userDenies];
    const earliest = allOverrides
      .map((o) => o.expires_at)
      .filter(Boolean)
      .sort()[0] as string | undefined;

    cards.push({
      id: ownerId || String(d.id),
      kind: "department",
      name: initialsName(String(d.name)),
      email: String(d.contact_email || user?.email || ""),
      avatarUrl: user?.avatar_url ? String(user.avatar_url) : null,
      planKey,
      planLabel: planName.get(planKey) || planKey,
      status: d.is_verified === false ? "pending" : String(user?.account_status || "active"),
      instituteName: d.institute_id ? instituteById.get(String(d.institute_id)) || null : null,
      orgId: String(d.id),
      detailHref: `/admin/departments/${d.id}`,
      metrics: {
        events: ownerId ? (eventCounts.get(ownerId) ?? 0) : 0,
        clubs: clubCountsByParent.get(String(d.id)) ?? 0,
        bookings: 0,
      },
      grants: orgGrants.length + userGrants.length,
      denies: orgDenies.length + userDenies.length,
      hasCustomPricing: ownerId ? pricingActive.has(ownerId) : false,
      earliestExpiry: earliest || null,
      createdAt: String(d.created_at || user?.created_at || ""),
    });
  }

  // Organizer cards — skip department_admin profiles already represented
  const deptOrgIds = new Set(deptRows.map((d) => String(d.id)));
  const deptOwnerSet = new Set(deptOwnerIds);
  for (const p of orgProfilesRows) {
    const uid = String(p.user_id);
    if (deptOwnerSet.has(uid)) continue;
    if (p.org_id && deptOrgIds.has(String(p.org_id))) continue;
    const user = userById.get(uid);
    const planKey = String(p.plan_type || "free");
    const g = grantsByOrganizer.get(uid) ?? [];
    const den = deniesByOrganizer.get(uid) ?? [];
    const earliest = [...g, ...den]
      .map((o) => o.expires_at)
      .filter(Boolean)
      .sort()[0] as string | undefined;
    let status = String(user?.account_status || "active");
    if (p.review_status === "pending" || p.review_status === "flagged") status = "pending";
    if (p.review_status === "rejected") status = "rejected";

    cards.push({
      id: uid,
      kind: "organizer",
      name: initialsName(String(p.org_name || user?.full_name || user?.email || "Organizer")),
      email: String(user?.email || ""),
      avatarUrl: user?.avatar_url ? String(user.avatar_url) : null,
      planKey,
      planLabel: planName.get(planKey) || planKey,
      status,
      instituteName: null,
      orgId: p.org_id ? String(p.org_id) : null,
      detailHref: `/admin/organizers/${uid}`,
      metrics: {
        events: eventCounts.get(uid) ?? 0,
        clubs: 0,
        bookings: 0,
      },
      grants: g.length,
      denies: den.length,
      hasCustomPricing: pricingActive.has(uid),
      earliestExpiry: earliest || null,
      createdAt: String(user?.created_at || ""),
    });
  }

  for (const v of vendorRows) {
    const uid = String(v.user_id);
    const user = userById.get(uid);
    const planKey = String(v.plan_type || "vendor_free");
    const g = grantsByOrganizer.get(uid) ?? [];
    const den = deniesByOrganizer.get(uid) ?? [];
    const earliest = [...g, ...den]
      .map((o) => o.expires_at)
      .filter(Boolean)
      .sort()[0] as string | undefined;
    let status = String(v.status || "pending");
    if (user?.account_status === "suspended") status = "suspended";

    cards.push({
      id: uid,
      kind: "vendor",
      name: initialsName(String(v.business_name || "Vendor")),
      email: String(v.business_email || user?.email || ""),
      avatarUrl: user?.avatar_url ? String(user.avatar_url) : null,
      planKey,
      planLabel: planName.get(planKey) || planKey,
      status,
      instituteName: null,
      orgId: null,
      detailHref: `/admin/vendors/${uid}`,
      metrics: {
        events: 0,
        clubs: 0,
        bookings: bookingCounts.get(uid) ?? 0,
      },
      grants: g.length,
      denies: den.length,
      hasCustomPricing: false,
      earliestExpiry: earliest || null,
      createdAt: String(user?.created_at || ""),
    });
  }

  let filtered = cards;

  if (filters.type.length) {
    const set = new Set(filters.type);
    filtered = filtered.filter((c) => set.has(c.kind));
  }
  if (filters.plan.length) {
    const set = new Set(filters.plan);
    filtered = filtered.filter((c) => set.has(c.planKey));
  }
  if (filters.status.length) {
    const set = new Set(filters.status as string[]);
    filtered = filtered.filter((c) => set.has(c.status));
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.instituteName || "").toLowerCase().includes(q),
    );
  }
  if (filters.hasOverrides === true) {
    filtered = filtered.filter((c) => c.grants + c.denies > 0);
  } else if (filters.hasOverrides === false) {
    filtered = filtered.filter((c) => c.grants + c.denies === 0);
  }
  if (filters.expiringSoon === true) {
    filtered = filtered.filter(
      (c) => c.earliestExpiry && new Date(c.earliestExpiry).getTime() <= soon,
    );
  }

  if (filters.sort === "name") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (filters.sort === "plan") {
    filtered = [...filtered].sort(
      (a, b) => a.planLabel.localeCompare(b.planLabel) || a.name.localeCompare(b.name),
    );
  } else {
    filtered = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const totalCards = filtered.length;
  const start = (filters.page - 1) * PAGE_SIZE;
  const pageCards = filtered.slice(start, start + PAGE_SIZE);

  const nameByUser = new Map(cards.map((c) => [c.id, c.name]));
  const nameByOrg = new Map(deptRows.map((d) => [String(d.id), String(d.name)]));

  let overrideRows = overrides.map((o) => {
    const organizerId = o.organizer_id ? String(o.organizer_id) : null;
    const targetOrgId = o.target_org_id ? String(o.target_org_id) : null;
    const tenantName =
      (organizerId && nameByUser.get(organizerId)) ||
      (targetOrgId && nameByOrg.get(targetOrgId)) ||
      organizerId ||
      targetOrgId ||
      "Tenant";
    return {
      id: String(o.id),
      moduleKey: String(o.module_key),
      denied: !!o.denied,
      reason: o.reason ? String(o.reason) : null,
      expiresAt: o.expires_at ? String(o.expires_at) : null,
      organizerId,
      targetOrgId,
      tenantName,
      tenantKind: (organizerId
        ? cards.find((c) => c.id === organizerId)?.kind || "organizer"
        : "department") as TenantType | "org",
      createdAt: String(o.created_at || ""),
    };
  });

  if (filters.overrideEffect.includes("grant") && !filters.overrideEffect.includes("deny")) {
    overrideRows = overrideRows.filter((r) => !r.denied);
  } else if (filters.overrideEffect.includes("deny") && !filters.overrideEffect.includes("grant")) {
    overrideRows = overrideRows.filter((r) => r.denied);
  }

  const overrideLimit = 40;
  let overrideSlice = overrideRows;
  if (filters.overrideCursor) {
    overrideSlice = overrideRows.filter((r) => r.createdAt < filters.overrideCursor!);
  }
  const overridesHasMore = overrideSlice.length > overrideLimit;
  const overridesPage = overridesHasMore ? overrideSlice.slice(0, overrideLimit) : overrideSlice;

  const pricing = (pricingRes.data ?? []).map((p) => ({
    id: String(p.id),
    organizerId: String(p.organizer_id),
    tenantName: nameByUser.get(String(p.organizer_id)) || String(p.organizer_id),
    discountPct: p.discount_pct != null ? Number(p.discount_pct) : null,
    flatMonthly: p.flat_monthly_override != null ? Number(p.flat_monthly_override) : null,
    notes: p.notes ? String(p.notes) : null,
    active: !!p.active,
    createdAt: String(p.created_at || ""),
  }));

  const activity = [
    ...(moderationRes.data ?? []).map((m) => ({
      id: `mod-${m.id}`,
      source: "moderation" as const,
      title: `${m.action} · ${m.target_type}`,
      detail: [m.target_label, m.reason].filter(Boolean).join(" — "),
      status: null,
      createdAt: String(m.created_at || ""),
    })),
    ...(emailLogRes.data ?? []).map((e) => ({
      id: `email-${e.id}`,
      source: "email" as const,
      title: e.subject || e.kind,
      detail: `${e.recipient}${e.error ? ` · ${e.error}` : ""}`,
      status: String(e.status),
      createdAt: String(e.created_at || ""),
      emailLogId: String(e.id),
      canResend: e.status === "failed" || e.status === "bounced",
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let activitySlice = activity;
  if (filters.activityCursor) {
    activitySlice = activity.filter((r) => r.createdAt < filters.activityCursor!);
  }
  const activityLimit = 40;
  const activityHasMore = activitySlice.length > activityLimit;
  const activityPage = activityHasMore ? activitySlice.slice(0, activityLimit) : activitySlice;

  const approvals = {
    orgs: (pendingOrgs.data ?? []).map((o) => ({
      kind: "org" as const,
      id: String(o.id),
      name: String(o.name),
      email: o.contact_email ? String(o.contact_email) : null,
      subtitle: String(o.org_type),
      createdAt: o.created_at ? String(o.created_at) : null,
    })),
    organizers: (pendingOrganizers.data ?? []).map((o) => ({
      kind: "organizer" as const,
      id: String(o.user_id),
      name: String(o.org_name || "Organizer"),
      email: null as string | null,
      subtitle: String(o.review_status),
      createdAt: null as string | null,
    })),
    vendors: (pendingVendors.data ?? []).map((v) => ({
      kind: "vendor" as const,
      id: String(v.user_id),
      name: String(v.business_name || "Vendor"),
      email: v.business_email ? String(v.business_email) : null,
      subtitle: "pending",
      createdAt: v.created_at ? String(v.created_at) : null,
    })),
  };

  // Enrich organizer emails
  const pendingOrgUserIds = approvals.organizers.map((o) => o.id);
  if (pendingOrgUserIds.length) {
    const pendingUsers = await inBatches(pendingOrgUserIds, async (chunk) => {
      const { data } = await supabaseAdmin.from(TABLES.USERS).select("id, email").in("id", chunk);
      return data ?? [];
    });
    const emailMap = new Map(pendingUsers.map((u) => [String(u.id), String(u.email || "")]));
    for (const row of approvals.organizers) {
      row.email = emailMap.get(row.id) || null;
    }
  }

  const approvalCount =
    approvals.orgs.length + approvals.organizers.length + approvals.vendors.length;

  return {
    filters,
    caps,
    plans,
    institutes,
    clubs,
    cards: pageCards,
    totalCards,
    tabCounts: {
      tenants: totalCards,
      approvals: approvalCount,
      overrides: overrideRows.length,
      pricing: pricing.filter((p) => p.active).length,
      activity: activity.length,
    },
    approvals,
    overrides: overridesPage,
    overridesNextCursor: overridesHasMore
      ? (overridesPage[overridesPage.length - 1]?.createdAt ?? null)
      : null,
    pricing,
    activity: activityPage,
    activityNextCursor: activityHasMore
      ? (activityPage[activityPage.length - 1]?.createdAt ?? null)
      : null,
  };
}
