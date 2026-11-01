/**
 * Pure parse/serialize for `/admin/tenants` searchParams ↔ filters.
 */

import {
  PAGE_SIZE,
  TENANT_BOARD_TABS,
  TENANT_SORTS,
  TENANT_STATUS_FILTERS,
  TENANT_TYPES,
  type TenantBoardFilters,
  type TenantBoardTab,
  type TenantSort,
  type TenantStatusFilter,
  type TenantType,
} from "./tenantBoard.types";

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

function parseBoolFlag(raw: string | null | undefined): boolean | null {
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return null;
}

function parseTab(raw: string | null | undefined): TenantBoardTab {
  if (raw && (TENANT_BOARD_TABS as readonly string[]).includes(raw)) return raw as TenantBoardTab;
  return "tenants";
}

function parseSort(raw: string | null | undefined): TenantSort {
  if (raw && (TENANT_SORTS as readonly string[]).includes(raw)) return raw as TenantSort;
  return "newest";
}

function parsePage(raw: string | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function emptyTenantFilters(partial?: Partial<TenantBoardFilters>): TenantBoardFilters {
  return {
    tab: "tenants",
    q: "",
    type: [],
    plan: [],
    status: [],
    hasOverrides: null,
    expiringSoon: null,
    sort: "newest",
    page: 1,
    overrideEffect: [],
    overrideCursor: null,
    activityCursor: null,
    ...partial,
  };
}

function getParam(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
  key: string,
): string | undefined {
  if (sp instanceof URLSearchParams) {
    const v = sp.get(key);
    return v ?? undefined;
  }
  const raw = sp[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export function parseTenantBoardFilters(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): TenantBoardFilters {
  const effectRaw = getParam(sp, "oeffect") ?? "";
  const overrideEffect = csvList(effectRaw, ["grant", "deny"] as const);

  return emptyTenantFilters({
    tab: parseTab(getParam(sp, "tab")),
    q: (getParam(sp, "q") ?? "").trim().slice(0, 120),
    type: csvList(getParam(sp, "type"), TENANT_TYPES),
    plan: csvIds(getParam(sp, "plan")),
    status: csvList(getParam(sp, "status"), TENANT_STATUS_FILTERS) as TenantStatusFilter[],
    hasOverrides: parseBoolFlag(getParam(sp, "hasOverrides")),
    expiringSoon: parseBoolFlag(getParam(sp, "expiring")),
    sort: parseSort(getParam(sp, "sort")),
    page: parsePage(getParam(sp, "page")),
    overrideEffect,
    overrideCursor: getParam(sp, "ocursor") || null,
    activityCursor: getParam(sp, "acursor") || null,
  });
}

export function serializeTenantBoardFilters(filters: TenantBoardFilters): string {
  const p = new URLSearchParams();
  if (filters.tab !== "tenants") p.set("tab", filters.tab);
  if (filters.q) p.set("q", filters.q);
  if (filters.type.length) p.set("type", filters.type.join(","));
  if (filters.plan.length) p.set("plan", filters.plan.join(","));
  if (filters.status.length) p.set("status", filters.status.join(","));
  if (filters.hasOverrides === true) p.set("hasOverrides", "1");
  if (filters.hasOverrides === false) p.set("hasOverrides", "0");
  if (filters.expiringSoon === true) p.set("expiring", "1");
  if (filters.sort !== "newest") p.set("sort", filters.sort);
  if (filters.page > 1) p.set("page", String(filters.page));
  if (filters.overrideEffect.length) p.set("oeffect", filters.overrideEffect.join(","));
  if (filters.overrideCursor) p.set("ocursor", filters.overrideCursor);
  if (filters.activityCursor) p.set("acursor", filters.activityCursor);
  return p.toString();
}

export function adminTenantsHref(
  filters: TenantBoardFilters,
  patch: Partial<TenantBoardFilters> = {},
): string {
  const next = { ...filters, ...patch };
  const qs = serializeTenantBoardFilters(next);
  return qs ? `/admin/tenants?${qs}` : "/admin/tenants";
}

export function hasActiveTenantFilters(filters: TenantBoardFilters): boolean {
  return Boolean(
    filters.q ||
    filters.type.length ||
    filters.plan.length ||
    filters.status.length ||
    filters.hasOverrides !== null ||
    filters.expiringSoon === true ||
    filters.sort !== "newest",
  );
}

/** Pure: plans shown for a create/change-plan audience. */
export function filterPlansForAudience<T extends { audience?: string | null }>(
  plans: T[],
  tenantType: TenantType | "both",
): T[] {
  if (tenantType === "vendor") {
    return plans.filter((p) => p.audience === "vendor" || p.audience === "both");
  }
  if (tenantType === "organizer" || tenantType === "department") {
    return plans.filter((p) => !p.audience || p.audience === "organizer" || p.audience === "both");
  }
  return plans;
}

/** Unique key for feature_overrides conflict detection (mirrors partial unique indexes). */
export function overrideConflictKey(input: {
  organizerId?: string | null;
  targetOrgId?: string | null;
  moduleKey: string;
}): string {
  const org = input.targetOrgId?.trim() || "";
  const owner = input.organizerId?.trim() || "";
  if (org) return `org:${org}:${input.moduleKey}`;
  return `user:${owner}:${input.moduleKey}`;
}

export { PAGE_SIZE, type TenantType };
