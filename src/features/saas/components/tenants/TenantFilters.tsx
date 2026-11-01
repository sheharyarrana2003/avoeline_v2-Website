"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { buttonClass, fieldClass } from "@/src/lib/ui";
import { adminTenantsHref, hasActiveTenantFilters } from "@/src/features/saas/tenantBoard.filters";
import type {
  TenantBoardFilters,
  PlanOption,
  TenantSort,
  TenantType,
} from "@/src/features/saas/tenantBoard.types";
import {
  TENANT_SORTS,
  TENANT_STATUS_FILTERS,
  TENANT_TYPES,
} from "@/src/features/saas/tenantBoard.types";

function toggleCsv<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-ink bg-ink text-ink-invert"
          : "border-line bg-paper text-ink-soft hover:border-line-loud hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

export function TenantFilters({
  filters,
  plans,
}: {
  filters: TenantBoardFilters;
  plans: PlanOption[];
}) {
  const router = useRouter();
  const push = (patch: Partial<TenantBoardFilters>) => {
    router.push(adminTenantsHref(filters, { ...patch, page: 1 }));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          defaultValue={filters.q}
          placeholder="Search name, email, institute…"
          className={`${fieldClass} pl-9`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              push({ q: (e.target as HTMLInputElement).value.trim() });
            }
          }}
          onBlur={(e) => {
            if (e.target.value.trim() !== filters.q) push({ q: e.target.value.trim() });
          }}
          aria-label="Search tenants"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-medium uppercase text-ink-soft">Type</span>
        {TENANT_TYPES.map((t: TenantType) => (
          <Chip
            key={t}
            active={filters.type.includes(t)}
            label={t}
            onClick={() => push({ type: toggleCsv(filters.type, t) })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-medium uppercase text-ink-soft">Plan</span>
        {plans.slice(0, 8).map((p) => (
          <Chip
            key={p.key}
            active={filters.plan.includes(p.key)}
            label={p.name}
            onClick={() => push({ plan: toggleCsv(filters.plan, p.key) })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-medium uppercase text-ink-soft">Status</span>
        {TENANT_STATUS_FILTERS.map((s) => (
          <Chip
            key={s}
            active={filters.status.includes(s)}
            label={s}
            onClick={() => push({ status: toggleCsv(filters.status, s) })}
          />
        ))}
        <Chip
          active={filters.hasOverrides === true}
          label="Has overrides"
          onClick={() => push({ hasOverrides: filters.hasOverrides === true ? null : true })}
        />
        <Chip
          active={filters.expiringSoon === true}
          label="Expiring soon"
          onClick={() => push({ expiringSoon: filters.expiringSoon === true ? null : true })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Sort
          <select
            className={`${fieldClass} w-auto py-1.5`}
            value={filters.sort}
            onChange={(e) => push({ sort: e.target.value as TenantSort })}
          >
            {TENANT_SORTS.map((s) => (
              <option key={s} value={s}>
                {s === "newest" ? "Newest" : s === "name" ? "Name" : "Plan"}
              </option>
            ))}
          </select>
        </label>
        {hasActiveTenantFilters(filters) ? (
          <button
            type="button"
            className={`${buttonClass("ghost", "sm")} gap-1`}
            onClick={() =>
              push({
                q: "",
                type: [],
                plan: [],
                status: [],
                hasOverrides: null,
                expiringSoon: null,
                sort: "newest",
              })
            }
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
}
