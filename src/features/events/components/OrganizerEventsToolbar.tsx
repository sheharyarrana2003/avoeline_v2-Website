"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import {
  EVENT_SORTS,
  EVENT_STATUS_FILTERS,
  KIND_LABELS,
  SORT_LABELS,
  STATUS_LABELS,
  hasActiveOrganizerEventFilters,
  organizerEventFilterChips,
  organizerEventsHref,
  type OrganizerEventFilters,
  type OrganizerEventKind,
  type OrganizerEventSort,
  type OrganizerEventStatusFilter,
  type OrganizerEventView,
} from "@/src/features/events/organizerEvents.filters";

function Chip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-0.5 text-2xs text-ink-soft hover:border-ink hover:text-ink"
    >
      {label}
      <X className="h-3 w-3" aria-hidden />
      <span className="sr-only">Remove {label}</span>
    </Link>
  );
}

export function OrganizerEventsToolbar({
  basePath,
  filters,
  statusCounts,
}: {
  basePath: string;
  filters: OrganizerEventFilters;
  statusCounts: Record<OrganizerEventStatusFilter, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const searchId = useId();
  const statusId = useId();
  const sortId = useId();

  useEffect(() => setQ(filters.q), [filters.q]);

  const push = (next: Partial<OrganizerEventFilters>) => {
    startTransition(() => {
      router.push(organizerEventsHref(basePath, filters, { ...next, page: 1 }));
    });
  };

  const chips = organizerEventFilterChips(filters);
  const kinds: OrganizerEventKind[] = ["all", "event", "hackathon"];

  return (
    <div className={`mb-6 space-y-3 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Event type" className="inline-flex rounded-lg border border-line p-0.5">
          {kinds.map((kind) => {
            const active = filters.kind === kind;
            return (
              <Link
                key={kind}
                href={organizerEventsHref(basePath, filters, { kind, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active ? "bg-ink text-ink-invert" : "text-ink-soft hover:text-ink"
                }`}
              >
                {KIND_LABELS[kind]}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem]">
            <label className={labelClass} htmlFor={statusId}>
              Status
            </label>
            <select
              id={statusId}
              className={fieldClass}
              value={filters.status}
              onChange={(e) => push({ status: e.target.value as OrganizerEventStatusFilter })}
            >
              {EVENT_STATUS_FILTERS.map((s) => {
                const count = statusCounts[s] ?? 0;
                return (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <form
            role="search"
            className="relative min-w-[12rem] flex-1 sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              push({ q: q.trim() });
            }}
          >
            <label className={labelClass} htmlFor={searchId}>
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <input
                id={searchId}
                className={`${fieldClass} pl-9`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events, venue, category"
              />
            </div>
          </form>

          <div className="min-w-[10rem]">
            <label className={labelClass} htmlFor={sortId}>
              Sort
            </label>
            <select
              id={sortId}
              className={fieldClass}
              value={filters.sort}
              onChange={(e) => push({ sort: e.target.value as OrganizerEventSort })}
            >
              {EVENT_SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div
            className="inline-flex rounded-lg border border-line p-0.5"
            role="group"
            aria-label="View"
          >
            {(
              [
                { view: "list" as OrganizerEventView, icon: List, label: "List" },
                { view: "grid" as OrganizerEventView, icon: LayoutGrid, label: "Grid" },
              ] as const
            ).map(({ view, icon: Icon, label }) => {
              const active = filters.view === view;
              return (
                <Link
                  key={view}
                  href={organizerEventsHref(basePath, filters, { view, page: 1 })}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={`rounded-md p-2 transition ${
                    active ? "bg-ink text-ink-invert" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {chips.length > 0 || hasActiveOrganizerEventFilters(filters) ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              href={organizerEventsHref(basePath, filters, chip.clear)}
            />
          ))}
          {hasActiveOrganizerEventFilters(filters) ? (
            <Link
              href={organizerEventsHref(basePath, filters, {
                kind: "all",
                status: "all",
                q: "",
                sort: "newest",
                view: filters.view,
                page: 1,
              })}
              className={buttonClass("ghost", "sm")}
            >
              Clear all
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
