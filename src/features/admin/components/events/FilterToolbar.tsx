"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { adminEventsHref } from "@/src/features/admin/eventModeration.filters";
import {
  ACCESS_FILTERS,
  PUBLICATION_FILTERS,
  PUBLICATION_LABELS,
  SORT_LABELS,
  TIMING_FILTERS,
  TIMING_LABELS,
  EVENT_SORTS,
  type AccessFilter,
  type AdminEventFilters,
  type CategoryOption,
  type EventSort,
  type PublicationFilter,
  type TimingFilter,
} from "@/src/features/admin/eventModeration.types";
import { MultiSelectPopover } from "./MultiSelectPopover";

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-0.5 text-2xs text-ink-soft hover:border-ink hover:text-ink"
    >
      {label}
      <X className="h-3 w-3" aria-hidden />
      <span className="sr-only">Remove {label}</span>
    </button>
  );
}

export function FilterToolbar({
  filters,
  categories,
  orgOptions,
  deptOptions,
  resultCount,
}: {
  filters: AdminEventFilters;
  categories: CategoryOption[];
  orgOptions: { id: string; label: string }[];
  deptOptions: { id: string; label: string }[];
  resultCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const searchId = useId();

  useEffect(() => setQ(filters.q), [filters.q]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const push = (next: Partial<AdminEventFilters>) => {
    startTransition(() => {
      router.push(adminEventsHref(filters, { ...next, cursor: null }));
    });
  };

  const chips: { key: string; label: string; clear: Partial<AdminEventFilters> }[] = [];
  for (const p of filters.publication) {
    chips.push({
      key: `pub-${p}`,
      label: PUBLICATION_LABELS[p],
      clear: { publication: filters.publication.filter((x) => x !== p) },
    });
  }
  for (const t of filters.timing) {
    chips.push({
      key: `t-${t}`,
      label: TIMING_LABELS[t],
      clear: { timing: filters.timing.filter((x) => x !== t) },
    });
  }
  for (const a of filters.access) {
    chips.push({
      key: `a-${a}`,
      label: a.replace(/_/g, " "),
      clear: { access: filters.access.filter((x) => x !== a) },
    });
  }
  for (const id of filters.categoryIds) {
    const cat = categories.find((c) => c.id === id);
    chips.push({
      key: `c-${id}`,
      label: cat?.label || id,
      clear: { categoryIds: filters.categoryIds.filter((x) => x !== id) },
    });
  }
  if (filters.from || filters.to) {
    chips.push({
      key: "dates",
      label: `Dates ${filters.from || "…"} → ${filters.to || "…"}`,
      clear: { from: "", to: "" },
    });
  }
  if (filters.org) {
    const o = orgOptions.find((x) => x.id === filters.org);
    chips.push({ key: "org", label: o?.label || "Organizer", clear: { org: "" } });
  }
  if (filters.dept) {
    const d = deptOptions.find((x) => x.id === filters.dept);
    chips.push({ key: "dept", label: d?.label || "Department", clear: { dept: "" } });
  }
  if (filters.hasRegs !== null) {
    chips.push({
      key: "regs",
      label: filters.hasRegs ? "Has registrations" : "No registrations",
      clear: { hasRegs: null },
    });
  }
  if (filters.q) {
    chips.push({ key: "q", label: `Search: ${filters.q}`, clear: { q: "" } });
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          role="search"
          className="relative min-w-[14rem] flex-1 basis-[16rem]"
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: q.trim() });
          }}
        >
          <label htmlFor={searchId} className="sr-only">
            Search events
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, category, city, host…"
            className={`${fieldClass} w-full pl-9 ${q ? "pr-9" : ""}`}
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-soft hover:bg-muted hover:text-ink"
              onClick={() => {
                setQ("");
                push({ q: "" });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </form>

        <MultiSelectPopover
          label="Publication"
          options={PUBLICATION_FILTERS.map((v) => ({ value: v, label: PUBLICATION_LABELS[v] }))}
          selected={filters.publication}
          onChange={(next) => push({ publication: next as PublicationFilter[] })}
        />
        <MultiSelectPopover
          label="Timing"
          options={TIMING_FILTERS.map((v) => ({ value: v, label: TIMING_LABELS[v] }))}
          selected={filters.timing}
          onChange={(next) => push({ timing: next as TimingFilter[] })}
        />
        <MultiSelectPopover
          label="Access"
          options={ACCESS_FILTERS.map((v) => ({ value: v, label: v.replace(/_/g, " ") }))}
          selected={filters.access}
          onChange={(next) => push({ access: next as AccessFilter[] })}
        />
        <MultiSelectPopover
          label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.label }))}
          selected={filters.categoryIds}
          onChange={(next) => push({ categoryIds: next })}
        />

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setMoreOpen((v) => !v)}
          >
            More filters
          </button>
          {moreOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-72 space-y-3 rounded-xl border border-line bg-paper p-3 shadow-lg">
              <div>
                <label className={labelClass} htmlFor="from-date">
                  From date
                </label>
                <input
                  id="from-date"
                  type="date"
                  className={fieldClass}
                  defaultValue={filters.from}
                  onChange={(e) => push({ from: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="to-date">
                  To date
                </label>
                <input
                  id="to-date"
                  type="date"
                  className={fieldClass}
                  defaultValue={filters.to}
                  onChange={(e) => push({ to: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="org-filter">
                  Organizer
                </label>
                <select
                  id="org-filter"
                  className={fieldClass}
                  value={filters.org}
                  onChange={(e) => push({ org: e.target.value })}
                >
                  <option value="">Any</option>
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="dept-filter">
                  Department / club
                </label>
                <select
                  id="dept-filter"
                  className={fieldClass}
                  value={filters.dept}
                  onChange={(e) => push({ dept: e.target.value })}
                >
                  <option value="">Any</option>
                  {deptOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="has-regs">
                  Registrations
                </label>
                <select
                  id="has-regs"
                  className={fieldClass}
                  value={filters.hasRegs === null ? "" : filters.hasRegs ? "1" : "0"}
                  onChange={(e) => {
                    const v = e.target.value;
                    push({ hasRegs: v === "" ? null : v === "1" });
                  }}
                >
                  <option value="">Any</option>
                  <option value="1">Has registrations</option>
                  <option value="0">None</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <label className="sr-only" htmlFor="event-sort">
          Sort
        </label>
        <select
          id="event-sort"
          className={`${fieldClass} w-auto`}
          value={filters.sort}
          disabled={pending}
          onChange={(e) => push({ sort: e.target.value as EventSort })}
        >
          {EVENT_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm tabular-nums text-ink-soft">
          {resultCount} event{resultCount === 1 ? "" : "s"}
        </span>
        {chips.length ? (
          <>
            {chips.map((c) => (
              <Chip key={c.key} label={c.label} onRemove={() => push(c.clear)} />
            ))}
            <button
              type="button"
              className="text-2xs font-semibold uppercase tracking-wide text-ink-soft hover:text-ink"
              onClick={() =>
                push({
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
                  sort: "newest",
                })
              }
            >
              Clear all
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
