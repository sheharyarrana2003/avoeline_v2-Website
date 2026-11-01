/**
 * Pure parse/serialize for `/organizer/[id]/events` searchParams ↔ filters.
 */

import type { EventLifecycle } from "@/src/lib/eventState";
import { matchesQuery, normalizeQuery } from "@/src/lib/search";

export const ORGANIZER_EVENTS_PAGE_SIZE = 20;

export const EVENT_KINDS = ["all", "event", "hackathon"] as const;
export type OrganizerEventKind = (typeof EVENT_KINDS)[number];

export const EVENT_SORTS = ["newest", "starts_soon", "most_registrations"] as const;
export type OrganizerEventSort = (typeof EVENT_SORTS)[number];

export const EVENT_VIEWS = ["list", "grid"] as const;
export type OrganizerEventView = (typeof EVENT_VIEWS)[number];

export const EVENT_STATUS_FILTERS = [
  "all",
  "draft",
  "upcoming",
  "ongoing",
  "completed",
  "published",
  "cancelled",
  "archived",
] as const;
export type OrganizerEventStatusFilter = (typeof EVENT_STATUS_FILTERS)[number];

export const STATUS_LABELS: Record<OrganizerEventStatusFilter, string> = {
  all: "All statuses",
  draft: "Draft",
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  published: "Unscheduled",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const SORT_LABELS: Record<OrganizerEventSort, string> = {
  newest: "Newest",
  starts_soon: "Starts soon",
  most_registrations: "Most registrations",
};

export const KIND_LABELS: Record<OrganizerEventKind, string> = {
  all: "All",
  event: "Events",
  hackathon: "Hackathons",
};

export type OrganizerEventFilters = {
  kind: OrganizerEventKind;
  status: OrganizerEventStatusFilter;
  q: string;
  sort: OrganizerEventSort;
  view: OrganizerEventView;
  page: number;
};

const DEFAULT_SORT: OrganizerEventSort = "newest";
const DEFAULT_VIEW: OrganizerEventView = "list";

function emptyFilters(partial?: Partial<OrganizerEventFilters>): OrganizerEventFilters {
  return {
    kind: "all",
    status: "all",
    q: "",
    sort: DEFAULT_SORT,
    view: DEFAULT_VIEW,
    page: 1,
    ...partial,
  };
}

function parseKind(raw: string | null | undefined): OrganizerEventKind {
  if (raw && (EVENT_KINDS as readonly string[]).includes(raw)) return raw as OrganizerEventKind;
  return "all";
}

function parseStatus(raw: string | null | undefined): OrganizerEventStatusFilter {
  if (raw && (EVENT_STATUS_FILTERS as readonly string[]).includes(raw)) {
    return raw as OrganizerEventStatusFilter;
  }
  return "all";
}

function parseSort(raw: string | null | undefined): OrganizerEventSort {
  if (raw && (EVENT_SORTS as readonly string[]).includes(raw)) return raw as OrganizerEventSort;
  return DEFAULT_SORT;
}

function parseView(raw: string | null | undefined): OrganizerEventView {
  if (raw && (EVENT_VIEWS as readonly string[]).includes(raw)) return raw as OrganizerEventView;
  return DEFAULT_VIEW;
}

function parsePage(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/** Parse Next.js searchParams (string | string[] | undefined values). */
export function parseOrganizerEventFilters(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): OrganizerEventFilters {
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
    kind: parseKind(get("kind")),
    status: parseStatus(get("status")),
    q: normalizeQuery(get("q")),
    sort: parseSort(get("sort")),
    view: parseView(get("view")),
    page: parsePage(get("page")),
  });
}

/**
 * Serialize filters to a query string (leading `?` omitted).
 * Omits defaults so URLs stay short.
 */
export function serializeOrganizerEventFilters(
  filters: OrganizerEventFilters,
  overrides?: Partial<OrganizerEventFilters>,
): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (f.kind !== "all") params.set("kind", f.kind);
  if (f.status !== "all") params.set("status", f.status);
  if (f.q) params.set("q", f.q);
  if (f.sort !== DEFAULT_SORT) params.set("sort", f.sort);
  if (f.view !== DEFAULT_VIEW) params.set("view", f.view);
  if (f.page > 1) params.set("page", String(f.page));

  return params.toString();
}

export function organizerEventsHref(
  basePath: string,
  filters: OrganizerEventFilters,
  overrides?: Partial<OrganizerEventFilters>,
): string {
  const qs = serializeOrganizerEventFilters(filters, overrides);
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasActiveOrganizerEventFilters(filters: OrganizerEventFilters): boolean {
  return (
    filters.kind !== "all" ||
    filters.status !== "all" ||
    Boolean(filters.q) ||
    filters.sort !== DEFAULT_SORT
  );
}

export type OrganizerEventFilterChip = {
  key: string;
  label: string;
  clear: Partial<OrganizerEventFilters>;
};

export function organizerEventFilterChips(
  filters: OrganizerEventFilters,
): OrganizerEventFilterChip[] {
  const chips: OrganizerEventFilterChip[] = [];
  if (filters.kind !== "all") {
    chips.push({
      key: "kind",
      label: KIND_LABELS[filters.kind],
      clear: { kind: "all", page: 1 },
    });
  }
  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label: STATUS_LABELS[filters.status],
      clear: { status: "all", page: 1 },
    });
  }
  if (filters.q) {
    chips.push({
      key: "q",
      label: `“${filters.q}”`,
      clear: { q: "", page: 1 },
    });
  }
  if (filters.sort !== DEFAULT_SORT) {
    chips.push({
      key: "sort",
      label: SORT_LABELS[filters.sort],
      clear: { sort: DEFAULT_SORT, page: 1 },
    });
  }
  return chips;
}

export type OrganizerEventListItem = {
  id: string;
  title: string;
  category?: string | null;
  eventType?: string | null;
  venueName?: string | null;
  city?: string | null;
  isHackathon: boolean;
  lifecycle: EventLifecycle;
  createdAtMs: number;
  startAtMs: number | null;
  registrations: number;
};

export function matchesOrganizerEventSearch(item: OrganizerEventListItem, q: string): boolean {
  if (!q) return true;
  return matchesQuery(q, [item.title, item.category, item.eventType, item.venueName, item.city]);
}

export function filterOrganizerEvents(
  items: OrganizerEventListItem[],
  filters: OrganizerEventFilters,
): OrganizerEventListItem[] {
  return items.filter((item) => {
    if (filters.kind === "hackathon" && !item.isHackathon) return false;
    if (filters.kind === "event" && item.isHackathon) return false;
    if (!matchesOrganizerEventSearch(item, filters.q)) return false;

    if (filters.status === "archived") return item.lifecycle === "archived";
    if (item.lifecycle === "archived") return false;
    if (filters.status === "all") return true;
    return item.lifecycle === filters.status;
  });
}

export function sortOrganizerEvents(
  items: OrganizerEventListItem[],
  sort: OrganizerEventSort,
): OrganizerEventListItem[] {
  const copy = [...items];
  if (sort === "starts_soon") {
    copy.sort((a, b) => {
      const aStart = a.startAtMs ?? Number.POSITIVE_INFINITY;
      const bStart = b.startAtMs ?? Number.POSITIVE_INFINITY;
      if (aStart !== bStart) return aStart - bStart;
      return b.createdAtMs - a.createdAtMs;
    });
    return copy;
  }
  if (sort === "most_registrations") {
    copy.sort((a, b) => {
      if (b.registrations !== a.registrations) return b.registrations - a.registrations;
      return b.createdAtMs - a.createdAtMs;
    });
    return copy;
  }
  copy.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return copy;
}

export function paginateOrganizerEvents<T>(
  items: T[],
  page: number,
  pageSize = ORGANIZER_EVENTS_PAGE_SIZE,
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

export function countOrganizerEventStatuses(
  items: OrganizerEventListItem[],
  filters: Pick<OrganizerEventFilters, "kind" | "q">,
): Record<OrganizerEventStatusFilter, number> {
  const base = items.filter((item) => {
    if (filters.kind === "hackathon" && !item.isHackathon) return false;
    if (filters.kind === "event" && item.isHackathon) return false;
    return matchesOrganizerEventSearch(item, filters.q);
  });

  const counts: Record<OrganizerEventStatusFilter, number> = {
    all: 0,
    draft: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    published: 0,
    cancelled: 0,
    archived: 0,
  };

  for (const item of base) {
    counts[item.lifecycle] = (counts[item.lifecycle] ?? 0) + 1;
    if (item.lifecycle !== "archived") counts.all += 1;
  }

  return counts;
}

export function liveAndArchivedCounts(
  items: OrganizerEventListItem[],
  filters: Pick<OrganizerEventFilters, "kind" | "q">,
): { live: number; archived: number } {
  const counts = countOrganizerEventStatuses(items, filters);
  return { live: counts.all, archived: counts.archived };
}

/** Whether delete should require typing the event title (regs present). */
export function deleteRequiresTitleConfirm(registrationCount: number): boolean {
  return registrationCount > 0;
}

/**
 * List-row title nodes for markup tests: thumb omits title; CellStack shows it once.
 */
export function listRowTitleNodes(opts: { title: string; showThumbTitle: boolean }): string[] {
  const nodes: string[] = [];
  if (opts.showThumbTitle) nodes.push(opts.title);
  nodes.push(opts.title);
  return nodes;
}
