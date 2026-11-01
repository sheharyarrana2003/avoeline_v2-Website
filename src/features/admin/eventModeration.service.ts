import "server-only";

import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { clampKeysetLimit, decodeKeysetCursor, encodeKeysetCursor } from "@/src/lib/keyset";
import { eventLifecycle } from "@/src/lib/eventState";
import { toIsoString } from "@/src/lib/datetime";
import { listModerationLogPage } from "./admin.service";
import {
  buildCategoryOptions,
  buildHostParts,
  matchesPublication,
  matchesTiming,
  resolveCategoryId,
} from "./eventModeration.filters";
import type {
  AdminEventFilters,
  AdminEventsBundle,
  AdminEventTabCounts,
  AdminModerationEventRow,
  CategoryOption,
  FlaggedEventRow,
  HostParts,
  ModerationLogRow,
} from "./eventModeration.types";
import { canManageArea, type AdminIdentity } from "./types";

const EVENT_COLS =
  "id, title, banner_image, category, format, event_type, status, visibility, start_date, end_date, start_time, end_time, organizer_id, org_id, total_seats, registrations_count, moderation_unpublished, created_at, city";

const PAGE = 25;

type EventRaw = {
  id: string;
  title: string;
  banner_image: string | null;
  category: string | null;
  format: string | null;
  event_type: string | null;
  status: string;
  visibility: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  organizer_id: string;
  org_id: string | null;
  total_seats: number | null;
  registrations_count: number | null;
  moderation_unpublished: boolean | null;
  created_at: string | null;
  city: string | null;
};

type OrgRow = {
  id: string;
  name: string | null;
  org_type: string | null;
  parent_org_id: string | null;
};

type ProfileRow = { user_id: string; org_name: string | null; org_id: string | null };

type ReportAgg = {
  event_id: string;
  count: number;
  latest_at: string;
  latest_reason: string;
  first_at: string;
};

async function loadCategories(): Promise<{
  rows: { id: string; name: string | null; category_type: string | null }[];
  options: CategoryOption[];
}> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_CATEGORIES)
    .select("id, name, category_type")
    .order("name");
  if (error) throw error;
  const rows = (data ?? []) as { id: string; name: string | null; category_type: string | null }[];
  return { rows, options: buildCategoryOptions(rows) };
}

async function loadOrgMaps(orgIds: string[], organizerIds: string[]) {
  const [{ data: orgs }, { data: profiles }, { data: allOrgs }] = await Promise.all([
    orgIds.length
      ? supabaseAdmin
          .from(TABLES.ORGANIZATIONS)
          .select("id, name, org_type, parent_org_id")
          .in("id", orgIds)
      : Promise.resolve({ data: [] as OrgRow[] }),
    organizerIds.length
      ? supabaseAdmin
          .from(TABLES.ORGANIZER_PROFILES)
          .select("user_id, org_name, org_id")
          .in("user_id", organizerIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    supabaseAdmin.from(TABLES.ORGANIZATIONS).select("id, name, org_type, parent_org_id"),
  ]);

  const orgById = new Map((allOrgs ?? orgs ?? []).map((o) => [String(o.id), o as OrgRow]));
  const profileByUser = new Map((profiles ?? []).map((p) => [String(p.user_id), p as ProfileRow]));
  return { orgById, profileByUser };
}

function hostFor(
  event: EventRaw,
  orgById: Map<string, OrgRow>,
  profileByUser: Map<string, ProfileRow>,
): HostParts {
  const profile = profileByUser.get(event.organizer_id);
  const orgId = event.org_id ? String(event.org_id) : profile?.org_id ? String(profile.org_id) : "";
  const org = orgId ? orgById.get(orgId) : null;
  const parent = org?.parent_org_id ? orgById.get(String(org.parent_org_id)) : null;
  return buildHostParts({
    organizerName: profile?.org_name || "Organizer",
    profileOrgName: profile?.org_name,
    orgType: org?.org_type,
    orgName: org?.name,
    parentOrgName: parent?.name,
  });
}

async function openReportAggs(eventIds?: string[]): Promise<Map<string, ReportAgg>> {
  let q = supabaseAdmin
    .from(TABLES.EVENT_REPORTS)
    .select("event_id, reason, created_at, status")
    .eq("status", "open");
  if (eventIds?.length) q = q.in("event_id", eventIds);
  const { data, error } = await q;
  if (error) throw error;

  const map = new Map<string, ReportAgg>();
  for (const row of data ?? []) {
    const eid = String(row.event_id);
    const at = toIsoString(row.created_at) || "";
    const reason = String(row.reason || "");
    const cur = map.get(eid);
    if (!cur) {
      map.set(eid, { event_id: eid, count: 1, latest_at: at, latest_reason: reason, first_at: at });
      continue;
    }
    cur.count += 1;
    if (at > cur.latest_at) {
      cur.latest_at = at;
      cur.latest_reason = reason;
    }
    if (at && (!cur.first_at || at < cur.first_at)) cur.first_at = at;
  }
  return map;
}

async function tabCounts(): Promise<AdminEventTabCounts> {
  const [eventsRes, openRes, logRes] = await Promise.all([
    supabaseAdmin.from(TABLES.EVENTS).select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from(TABLES.EVENT_REPORTS)
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabaseAdmin.from(TABLES.MODERATION_LOGS).select("id", { count: "exact", head: true }),
  ]);
  return {
    all: eventsRes.count ?? 0,
    openReports: openRes.count ?? 0,
    log: logRes.count ?? 0,
  };
}

function mapEventRow(
  raw: EventRaw,
  categories: { id: string; name: string | null }[],
  catOptions: CategoryOption[],
  orgById: Map<string, OrgRow>,
  profileByUser: Map<string, ProfileRow>,
  reports: Map<string, ReportAgg>,
): AdminModerationEventRow {
  const categoryId = resolveCategoryId(raw.category, categories);
  const catOpt = catOptions.find((c) => c.id === categoryId);
  const agg = reports.get(raw.id);
  return {
    id: raw.id,
    title: raw.title || "Untitled event",
    bannerImage: raw.banner_image || null,
    categoryId,
    categoryLabel: catOpt?.label || String(raw.category || "—"),
    format: String(raw.format || raw.event_type || ""),
    status: String(raw.status || "draft"),
    visibility: String(raw.visibility || "public"),
    startDate: raw.start_date,
    endDate: raw.end_date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    organizerId: raw.organizer_id,
    orgId: raw.org_id,
    totalSeats: raw.total_seats,
    registrationsCount: Number(raw.registrations_count ?? 0),
    moderationUnpublished: !!raw.moderation_unpublished,
    createdAt: toIsoString(raw.created_at) || "",
    city: raw.city,
    host: hostFor(raw, orgById, profileByUser),
    openReportCount: agg?.count ?? 0,
    latestReportAt: agg?.latest_at ?? null,
  };
}

function applySearch(row: AdminModerationEventRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.title,
    row.categoryLabel,
    row.format,
    row.city,
    row.host.organizerName,
    row.host.departmentName,
    row.host.clubName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function sortRows(
  rows: AdminModerationEventRow[],
  sort: AdminEventFilters["sort"],
): AdminModerationEventRow[] {
  const copy = [...rows];
  if (sort === "starts_soon") {
    copy.sort(
      (a, b) =>
        String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")) ||
        a.id.localeCompare(b.id),
    );
  } else if (sort === "most_regs") {
    copy.sort((a, b) => b.registrationsCount - a.registrationsCount || a.id.localeCompare(b.id));
  } else if (sort === "recently_reported") {
    copy.sort(
      (a, b) =>
        String(b.latestReportAt || "").localeCompare(String(a.latestReportAt || "")) ||
        a.id.localeCompare(b.id),
    );
  } else {
    copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }
  return copy;
}

async function listFilteredEventsPage(
  filters: AdminEventFilters,
  categories: { id: string; name: string | null; category_type: string | null }[],
  catOptions: CategoryOption[],
): Promise<{ rows: AdminModerationEventRow[]; nextCursor: string | null; totalMatching: number }> {
  const limit = clampKeysetLimit(PAGE);
  const overFetch =
    filters.timing.length || filters.q || filters.sort === "recently_reported" ? 120 : limit + 1;

  let q = supabaseAdmin.from(TABLES.EVENTS).select(EVENT_COLS);

  if (filters.publication.length === 1) {
    const p = filters.publication[0]!;
    if (p === "unpublished") q = q.eq("moderation_unpublished", true);
    else if (p === "draft") q = q.eq("status", "draft").eq("moderation_unpublished", false);
    else if (p === "published") q = q.eq("status", "published").eq("moderation_unpublished", false);
    else if (p === "cancelled") q = q.eq("status", "cancelled");
    else if (p === "archived") q = q.eq("status", "archived");
  } else if (filters.publication.length > 1) {
    const ors: string[] = [];
    for (const p of filters.publication) {
      if (p === "unpublished") ors.push("moderation_unpublished.eq.true");
      else if (p === "draft") ors.push("and(status.eq.draft,moderation_unpublished.eq.false)");
      else if (p === "published")
        ors.push("and(status.eq.published,moderation_unpublished.eq.false)");
      else if (p === "cancelled") ors.push("status.eq.cancelled");
      else if (p === "archived") ors.push("status.eq.archived");
    }
    if (ors.length) q = q.or(ors.join(","));
  }

  if (filters.access.length) q = q.in("visibility", filters.access);
  if (filters.categoryIds.length) {
    // Events may store slug or display name; match ids + names case-insensitively in memory after.
    const names = categories
      .filter((c) => filters.categoryIds.includes(c.id))
      .flatMap((c) => [c.id, c.name].filter(Boolean) as string[]);
    const uniq = [...new Set(names)];
    if (uniq.length) q = q.in("category", uniq);
  }
  if (filters.from) q = q.gte("start_date", filters.from);
  if (filters.to) q = q.lte("start_date", filters.to);
  if (filters.org) q = q.eq("organizer_id", filters.org);
  if (filters.dept) q = q.eq("org_id", filters.dept);
  if (filters.hasRegs === true) q = q.gt("registrations_count", 0);
  if (filters.hasRegs === false) q = q.or("registrations_count.is.null,registrations_count.eq.0");

  if (filters.sort === "starts_soon") {
    q = q
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (filters.sort === "most_regs") {
    q = q
      .order("registrations_count", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else {
    q = q
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  }

  const cursor = decodeKeysetCursor(filters.cursor);
  if (cursor && filters.sort === "newest") {
    q = q.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
  }

  q = q.limit(overFetch);

  const { data, error } = await q;
  if (error) throw error;
  const raws = (data ?? []) as EventRaw[];
  if (!raws.length) return { rows: [], nextCursor: null, totalMatching: 0 };

  const organizerIds = [...new Set(raws.map((e) => e.organizer_id).filter(Boolean))];
  const orgIds = [
    ...new Set(
      raws
        .map((e) => e.org_id)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const eventIds = raws.map((e) => e.id);

  const [{ orgById, profileByUser }, reports] = await Promise.all([
    loadOrgMaps(orgIds, organizerIds),
    openReportAggs(eventIds),
  ]);

  let rows = raws.map((r) =>
    mapEventRow(r, categories, catOptions, orgById, profileByUser, reports),
  );

  // Multi-pub residual check (defensive) + category case + timing + search
  rows = rows.filter((row) => {
    if (!matchesPublication(row.status, row.moderationUnpublished, filters.publication))
      return false;
    if (filters.categoryIds.length && !filters.categoryIds.includes(row.categoryId)) {
      // also allow unresolved free-text that matched the in-query
      const resolved = resolveCategoryId(row.categoryId, categories);
      if (!filters.categoryIds.includes(resolved) && !filters.categoryIds.includes(row.categoryId))
        return false;
    }
    const life = eventLifecycle(row.status, {
      startDate: row.startDate,
      endDate: row.endDate,
      startTime: row.startTime,
      endTime: row.endTime,
    });
    if (!matchesTiming(life, filters.timing)) return false;
    if (!applySearch(row, filters.q)) return false;
    return true;
  });

  rows = sortRows(rows, filters.sort);

  const page = rows.slice(0, limit);
  let nextCursor: string | null = null;
  if (rows.length > limit && page.length) {
    const last = page[page.length - 1]!;
    nextCursor = encodeKeysetCursor({
      at: last.createdAt || last.startDate || last.id,
      id: last.id,
    });
  }

  return { rows: page, nextCursor, totalMatching: rows.length };
}

async function listFlaggedPage(
  filters: AdminEventFilters,
  categories: { id: string; name: string | null; category_type: string | null }[],
  catOptions: CategoryOption[],
): Promise<{ rows: FlaggedEventRow[]; nextCursor: string | null }> {
  const limit = clampKeysetLimit(PAGE);
  const aggs = await openReportAggs();
  const eventIds = [...aggs.keys()];
  if (!eventIds.length) return { rows: [], nextCursor: null };

  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select(EVENT_COLS)
    .in("id", eventIds);
  if (error) throw error;
  const raws = (data ?? []) as EventRaw[];

  const organizerIds = [...new Set(raws.map((e) => e.organizer_id).filter(Boolean))];
  const orgIds = [
    ...new Set(
      raws
        .map((e) => e.org_id)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const { orgById, profileByUser } = await loadOrgMaps(orgIds, organizerIds);

  let rows: FlaggedEventRow[] = raws.map((raw) => {
    const mapped = mapEventRow(raw, categories, catOptions, orgById, profileByUser, aggs);
    const agg = aggs.get(raw.id)!;
    return {
      eventId: mapped.id,
      title: mapped.title,
      bannerImage: mapped.bannerImage,
      categoryLabel: mapped.categoryLabel,
      format: mapped.format,
      status: mapped.status,
      moderationUnpublished: mapped.moderationUnpublished,
      organizerId: mapped.organizerId,
      host: mapped.host,
      reportCount: agg.count,
      latestReason: agg.latest_reason,
      firstReportedAt: agg.first_at,
      latestReportedAt: agg.latest_at,
    };
  });

  rows.sort(
    (a, b) =>
      b.latestReportedAt.localeCompare(a.latestReportedAt) || a.eventId.localeCompare(b.eventId),
  );

  const cursor = filters.flaggedCursor;
  if (cursor) {
    const idx = rows.findIndex((r) => r.eventId === cursor);
    if (idx >= 0) rows = rows.slice(idx + 1);
  }

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? (page[page.length - 1]?.eventId ?? null) : null;
  return { rows: page, nextCursor };
}

async function listLogFiltered(
  filters: AdminEventFilters,
): Promise<{ rows: ModerationLogRow[]; nextCursor: string | null }> {
  const { rows, nextCursor } = await listModerationLogPage({
    cursor: filters.logCursor,
    limit: PAGE,
  });

  let mapped: ModerationLogRow[] = rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    targetLabel: r.targetLabel,
    action: r.action,
    reason: r.reason,
    adminId: r.adminId,
    adminEmail: r.adminEmail,
    createdAt: r.createdAt,
    notified: !!(r.extra && r.extra.notified),
  }));

  if (filters.logAction.length) {
    mapped = mapped.filter((r) =>
      filters.logAction.includes(r.action as (typeof filters.logAction)[number]),
    );
  }
  if (filters.logAdmin) {
    const a = filters.logAdmin.toLowerCase();
    mapped = mapped.filter(
      (r) => r.adminEmail.toLowerCase().includes(a) || r.adminId === filters.logAdmin,
    );
  }
  if (filters.logFrom) mapped = mapped.filter((r) => r.createdAt >= filters.logFrom);
  if (filters.logTo) mapped = mapped.filter((r) => r.createdAt.slice(0, 10) <= filters.logTo);
  if (filters.logQ) {
    const q = filters.logQ.toLowerCase();
    mapped = mapped.filter(
      (r) => r.targetLabel.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q),
    );
  }

  // Enrich banners for event targets
  const eventIds = [
    ...new Set(mapped.filter((r) => r.targetType === "event").map((r) => r.targetId)),
  ];
  if (eventIds.length) {
    const { data } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, banner_image")
      .in("id", eventIds);
    const bannerById = new Map(
      (data ?? []).map((e) => [String(e.id), e.banner_image as string | null]),
    );
    mapped = mapped.map((r) =>
      r.targetType === "event" ? { ...r, bannerImage: bannerById.get(r.targetId) ?? null } : r,
    );
  }

  return { rows: mapped, nextCursor };
}

async function filterOptions() {
  const [{ data: orgs }, { data: profiles }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("id, name, org_type")
      .in("org_type", ["department", "club"])
      .order("name"),
    supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).select("user_id, org_name").order("org_name"),
  ]);

  const deptOptions = (orgs ?? [])
    .filter((o) => o.org_type === "department")
    .map((o) => ({ id: String(o.id), label: String(o.name || o.id) }));

  const orgOptions = (profiles ?? []).map((p) => ({
    id: String(p.user_id),
    label: String(p.org_name || p.user_id),
  }));

  return { deptOptions, orgOptions };
}

/**
 * Bundle for `/admin/events`: events page + tab counts + categories + flagged/log as needed.
 */
export const getAdminEventsBundle = cache(
  async (filters: AdminEventFilters, admin: AdminIdentity): Promise<AdminEventsBundle> => {
    const [{ rows: categories, options: catOptions }, counts, opts] = await Promise.all([
      loadCategories(),
      tabCounts(),
      filterOptions(),
    ]);

    const empty = {
      filters,
      tabCounts: counts,
      events: [] as AdminModerationEventRow[],
      eventsNextCursor: null as string | null,
      eventsTotalMatching: 0,
      flagged: [] as FlaggedEventRow[],
      flaggedNextCursor: null as string | null,
      log: [] as ModerationLogRow[],
      logNextCursor: null as string | null,
      categories: catOptions,
      orgOptions: opts.orgOptions,
      deptOptions: opts.deptOptions,
      canModerate: canManageArea(admin, "events"),
      isOwner: admin.isOwner,
    };

    if (filters.tab === "flagged") {
      const flagged = await listFlaggedPage(filters, categories, catOptions);
      return { ...empty, flagged: flagged.rows, flaggedNextCursor: flagged.nextCursor };
    }

    if (filters.tab === "log") {
      const log = await listLogFiltered(filters);
      return { ...empty, log: log.rows, logNextCursor: log.nextCursor };
    }

    const page = await listFilteredEventsPage(filters, categories, catOptions);
    return {
      ...empty,
      events: page.rows,
      eventsNextCursor: page.nextCursor,
      eventsTotalMatching: page.totalMatching,
    };
  },
);

/** Reports for one event (drawer). */
export async function listReportsForEvent(eventId: string) {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_REPORTS)
    .select(
      "id, event_id, event_title, reason, reporter_email, status, created_at, decided_at, admin_note",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    eventId: String(r.event_id),
    eventTitle: String(r.event_title || ""),
    reason: String(r.reason || ""),
    reporterEmail: String(r.reporter_email || ""),
    status: (["open", "dismissed", "actioned"].includes(String(r.status))
      ? String(r.status)
      : "open") as "open" | "dismissed" | "actioned",
    createdAt: toIsoString(r.created_at) || "",
    decidedAt: toIsoString(r.decided_at),
    adminNote: r.admin_note ? String(r.admin_note) : null,
  }));
}
