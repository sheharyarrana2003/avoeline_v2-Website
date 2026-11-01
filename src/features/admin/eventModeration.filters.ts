/**
 * Pure parse/serialize for `/admin/events` searchParams ↔ filters.
 * Also host-label + category-option helpers (unit-tested).
 */

import {
  ACCESS_FILTERS,
  ADMIN_EVENT_TABS,
  EVENT_SORTS,
  LOG_ACTIONS,
  PUBLICATION_FILTERS,
  TIMING_FILTERS,
  type AccessFilter,
  type AdminEventFilters,
  type AdminEventTab,
  type CategoryOption,
  type EventSort,
  type HostParts,
  type LogActionFilter,
  type PublicationFilter,
  type TimingFilter,
} from "./eventModeration.types";

const DEFAULT_SORT: EventSort = "newest";

function csvList<T extends string>(raw: string | null | undefined, allowed: readonly T[]): T[] {
  if (!raw?.trim()) return [];
  const set = new Set(allowed);
  const out: T[] = [];
  for (const part of raw.split(",")) {
    const v = part.trim() as T;
    if (set.has(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function csvIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const v = part.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function parseTab(raw: string | null | undefined): AdminEventTab {
  if (raw && (ADMIN_EVENT_TABS as readonly string[]).includes(raw)) return raw as AdminEventTab;
  return "all";
}

function parseSort(raw: string | null | undefined): EventSort {
  if (raw && (EVENT_SORTS as readonly string[]).includes(raw)) return raw as EventSort;
  return DEFAULT_SORT;
}

function parseHasRegs(raw: string | null | undefined): boolean | null {
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return null;
}

function emptyFilters(partial?: Partial<AdminEventFilters>): AdminEventFilters {
  return {
    tab: "all",
    q: "",
    publication: [],
    timing: [],
    access: [],
    categoryIds: [],
    from: "",
    to: "",
    org: "",
    dept: "",
    hasRegs: null,
    sort: DEFAULT_SORT,
    cursor: null,
    logAction: [],
    logAdmin: "",
    logFrom: "",
    logTo: "",
    logQ: "",
    logCursor: null,
    flaggedCursor: null,
    ...partial,
  };
}

/** Parse Next.js searchParams (string | string[] | undefined values). */
export function parseAdminEventFilters(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): AdminEventFilters {
  const get = (key: string): string | undefined => {
    if (sp instanceof URLSearchParams) {
      const v = sp.get(key);
      return v ?? undefined;
    }
    const raw = sp[key];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  return emptyFilters({
    tab: parseTab(get("tab")),
    q: (get("q") ?? "").trim(),
    publication: csvList(get("pub"), PUBLICATION_FILTERS),
    timing: csvList(get("timing"), TIMING_FILTERS),
    access: csvList(get("access"), ACCESS_FILTERS),
    categoryIds: csvIds(get("cat")),
    from: (get("from") ?? "").trim(),
    to: (get("to") ?? "").trim(),
    org: (get("org") ?? "").trim(),
    dept: (get("dept") ?? "").trim(),
    hasRegs: parseHasRegs(get("hasRegs")),
    sort: parseSort(get("sort")),
    cursor: (get("cursor") ?? "").trim() || null,
    logAction: csvList(get("logAction"), LOG_ACTIONS),
    logAdmin: (get("logAdmin") ?? "").trim(),
    logFrom: (get("logFrom") ?? "").trim(),
    logTo: (get("logTo") ?? "").trim(),
    logQ: (get("logQ") ?? "").trim(),
    logCursor: (get("logCursor") ?? "").trim() || null,
    flaggedCursor: (get("flaggedCursor") ?? "").trim() || null,
  });
}

function setCsv(params: URLSearchParams, key: string, values: string[]) {
  if (values.length) params.set(key, values.join(","));
}

/**
 * Serialize filters to a query string (leading `?` omitted).
 * Omits defaults so URLs stay short.
 */
export function serializeAdminEventFilters(
  filters: AdminEventFilters,
  overrides?: Partial<AdminEventFilters>,
): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (f.tab !== "all") params.set("tab", f.tab);
  if (f.q) params.set("q", f.q);
  setCsv(params, "pub", f.publication);
  setCsv(params, "timing", f.timing);
  setCsv(params, "access", f.access);
  setCsv(params, "cat", f.categoryIds);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (f.org) params.set("org", f.org);
  if (f.dept) params.set("dept", f.dept);
  if (f.hasRegs === true) params.set("hasRegs", "1");
  if (f.hasRegs === false) params.set("hasRegs", "0");
  if (f.sort !== DEFAULT_SORT) params.set("sort", f.sort);
  if (f.cursor) params.set("cursor", f.cursor);

  setCsv(params, "logAction", f.logAction);
  if (f.logAdmin) params.set("logAdmin", f.logAdmin);
  if (f.logFrom) params.set("logFrom", f.logFrom);
  if (f.logTo) params.set("logTo", f.logTo);
  if (f.logQ) params.set("logQ", f.logQ);
  if (f.logCursor) params.set("logCursor", f.logCursor);
  if (f.flaggedCursor) params.set("flaggedCursor", f.flaggedCursor);

  return params.toString();
}

export function adminEventsHref(
  filters: AdminEventFilters,
  overrides?: Partial<AdminEventFilters>,
): string {
  const qs = serializeAdminEventFilters(filters, overrides);
  return qs ? `/admin/events?${qs}` : "/admin/events";
}

/**
 * Build host label parts without repeating department as club.
 * Organizer line 1; "Department › Club" only for levels that exist and differ.
 */
export function buildHostParts(input: {
  organizerName?: string | null;
  orgType?: string | null;
  orgName?: string | null;
  parentOrgName?: string | null;
  profileOrgName?: string | null;
}): HostParts {
  const organizerName =
    String(input.organizerName || input.profileOrgName || "Organizer").trim() || "Organizer";

  const orgType = String(input.orgType || "").toLowerCase();
  const orgName = String(input.orgName || "").trim();
  const parentName = String(input.parentOrgName || "").trim();

  if (orgType === "club") {
    const clubName = orgName || undefined;
    const departmentName = parentName && parentName !== clubName ? parentName : undefined;
    return { organizerName, departmentName, clubName };
  }

  if (orgType === "department") {
    // Never treat profile.org_name as the club when it equals the department.
    const departmentName = orgName || undefined;
    return { organizerName, departmentName };
  }

  return { organizerName };
}

export function formatHostLine2(host: HostParts): string {
  const parts = [host.departmentName, host.clubName].filter(Boolean);
  return parts.join(" › ");
}

/**
 * Category filter options from taxonomy rows.
 * Duplicate display names get a distinguishing suffix (type or short id).
 *
 * Root cause of "Technology" twice on the old page: events stored both
 * `technology` and `Technology` as free-text `events.category`, and the UI
 * built options via `new Set(events.map(e => e.category))` instead of
 * `event_categories` by id.
 */
export function buildCategoryOptions(
  rows: { id: string; name: string | null; category_type?: string | null }[],
): CategoryOption[] {
  const byName = new Map<string, number>();
  for (const row of rows) {
    const name = String(row.name || row.id).trim() || row.id;
    byName.set(name.toLowerCase(), (byName.get(name.toLowerCase()) ?? 0) + 1);
  }

  return rows
    .map((row) => {
      const name = String(row.name || row.id).trim() || row.id;
      const dup = (byName.get(name.toLowerCase()) ?? 0) > 1;
      const type = String(row.category_type || "").replace(/_/g, " ");
      const detail = dup ? type || row.id.slice(0, 8) : undefined;
      return {
        id: row.id,
        label: dup && detail ? `${name} (${detail})` : name,
        detail,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Match an event's stored category string to a taxonomy id (case-insensitive). */
export function resolveCategoryId(
  stored: string | null | undefined,
  categories: { id: string; name: string | null }[],
): string {
  const raw = String(stored || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const byId = categories.find((c) => c.id.toLowerCase() === lower);
  if (byId) return byId.id;
  const byName = categories.find((c) => String(c.name || "").toLowerCase() === lower);
  return byName?.id ?? raw;
}

export function matchesPublication(
  status: string,
  moderationUnpublished: boolean,
  selected: PublicationFilter[],
): boolean {
  if (!selected.length) return true;
  const s = String(status || "").toLowerCase();
  return selected.some((p) => {
    if (p === "unpublished") return moderationUnpublished;
    if (p === "draft") return s === "draft" && !moderationUnpublished;
    if (p === "published") return s === "published" && !moderationUnpublished;
    if (p === "cancelled") return s === "cancelled";
    if (p === "archived") return s === "archived";
    return false;
  });
}

export function matchesTiming(life: string, selected: TimingFilter[]): boolean {
  if (!selected.length) return true;
  return selected.includes(life as TimingFilter);
}

export type { AccessFilter, PublicationFilter, TimingFilter, EventSort, LogActionFilter };
