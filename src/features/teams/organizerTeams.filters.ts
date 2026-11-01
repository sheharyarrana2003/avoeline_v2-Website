/**
 * Pure parse/serialize for `/organizer/[id]/teams` searchParams ↔ filters.
 */

import { normalizeQuery } from "@/src/lib/search";

export const ORGANIZER_TEAMS_PAGE_SIZE = 20;

export const ORGANIZER_TEAMS_TABS = ["teams", "recruitment", "access"] as const;
export type OrganizerTeamsTab = (typeof ORGANIZER_TEAMS_TABS)[number];

export const ORGANIZER_TEAMS_ROLES = ["all", "lead", "member"] as const;
export type OrganizerTeamsRoleFilter = (typeof ORGANIZER_TEAMS_ROLES)[number];

export const ORGANIZER_TEAMS_ACCESS = ["all", "none", "invited", "active", "revoked"] as const;
export type OrganizerTeamsAccessFilter = (typeof ORGANIZER_TEAMS_ACCESS)[number];

export const TAB_LABELS: Record<OrganizerTeamsTab, string> = {
  teams: "Teams",
  recruitment: "Recruitment",
  access: "Access",
};

export const ROLE_LABELS: Record<OrganizerTeamsRoleFilter, string> = {
  all: "All roles",
  lead: "Lead",
  member: "Member",
};

export const ACCESS_LABELS: Record<OrganizerTeamsAccessFilter, string> = {
  all: "All access",
  none: "None",
  invited: "Invited",
  active: "Active",
  revoked: "Revoked",
};

export type OrganizerTeamsFilters = {
  tab: OrganizerTeamsTab;
  q: string;
  /** Team id filter; empty = all teams */
  team: string;
  role: OrganizerTeamsRoleFilter;
  access: OrganizerTeamsAccessFilter;
  page: number;
};

const DEFAULT_TAB: OrganizerTeamsTab = "teams";
const DEFAULT_ROLE: OrganizerTeamsRoleFilter = "all";
const DEFAULT_ACCESS: OrganizerTeamsAccessFilter = "all";

function emptyFilters(partial?: Partial<OrganizerTeamsFilters>): OrganizerTeamsFilters {
  return {
    tab: DEFAULT_TAB,
    q: "",
    team: "",
    role: DEFAULT_ROLE,
    access: DEFAULT_ACCESS,
    page: 1,
    ...partial,
  };
}

function parseTab(raw: string | null | undefined): OrganizerTeamsTab {
  if (raw && (ORGANIZER_TEAMS_TABS as readonly string[]).includes(raw)) {
    return raw as OrganizerTeamsTab;
  }
  return DEFAULT_TAB;
}

function parseRole(raw: string | null | undefined): OrganizerTeamsRoleFilter {
  if (raw && (ORGANIZER_TEAMS_ROLES as readonly string[]).includes(raw)) {
    return raw as OrganizerTeamsRoleFilter;
  }
  return DEFAULT_ROLE;
}

function parseAccess(raw: string | null | undefined): OrganizerTeamsAccessFilter {
  if (raw && (ORGANIZER_TEAMS_ACCESS as readonly string[]).includes(raw)) {
    return raw as OrganizerTeamsAccessFilter;
  }
  return DEFAULT_ACCESS;
}

function parsePage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
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

/** Parse Next.js searchParams (string | string[] | undefined values). */
export function parseOrganizerTeamsFilters(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): OrganizerTeamsFilters {
  return emptyFilters({
    tab: parseTab(getParam(sp, "tab")),
    q: normalizeQuery(getParam(sp, "q")),
    team: String(getParam(sp, "team") ?? "").trim(),
    role: parseRole(getParam(sp, "role")),
    access: parseAccess(getParam(sp, "access")),
    page: parsePage(getParam(sp, "page")),
  });
}

/**
 * Serialize filters to a query string (leading `?` omitted).
 * Omits defaults so URLs stay short.
 */
export function serializeOrganizerTeamsFilters(
  filters: OrganizerTeamsFilters,
  overrides?: Partial<OrganizerTeamsFilters>,
): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (f.tab !== DEFAULT_TAB) params.set("tab", f.tab);
  if (f.q) params.set("q", f.q);
  if (f.team) params.set("team", f.team);
  if (f.role !== DEFAULT_ROLE) params.set("role", f.role);
  if (f.access !== DEFAULT_ACCESS) params.set("access", f.access);
  if (f.page > 1) params.set("page", String(f.page));

  return params.toString();
}

export function organizerTeamsHref(
  basePath: string,
  filters: OrganizerTeamsFilters,
  overrides?: Partial<OrganizerTeamsFilters>,
): string {
  const qs = serializeOrganizerTeamsFilters(filters, overrides);
  return qs ? `${basePath}?${qs}` : basePath;
}

export function isAdvancedOrganizerTeamsTab(tab: OrganizerTeamsTab): boolean {
  return tab === "recruitment" || tab === "access";
}

export function paginateOrganizerTeamsList<T>(
  items: T[],
  page: number,
  pageSize = ORGANIZER_TEAMS_PAGE_SIZE,
): { pageItems: T[]; total: number; page: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    total,
    page: safePage,
    totalPages,
  };
}
