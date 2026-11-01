"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ANALYTICS_PRESETS,
  PRESET_LABELS,
  analyticsHref,
  type AnalyticsFilters,
  type AnalyticsPreset,
} from "@/src/features/analytics/analytics.filters";
import { buttonClass } from "@/src/lib/ui";
import { exportAnalyticsAction } from "@/src/features/analytics/actions/exportAnalytics.action";

export default function AnalyticsFiltersBar({
  organizerId,
  basePath,
  filters,
  eventOptions,
  rangeLabel,
}: {
  organizerId: string;
  basePath: string;
  filters: AnalyticsFilters;
  eventOptions: { id: string; title: string }[];
  rangeLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(overrides: Partial<AnalyticsFilters>) {
    router.push(analyticsHref(basePath, filters, overrides));
  }

  async function onExport() {
    const res = await exportAnalyticsAction({
      organizerId,
      range: filters.preset,
      event: filters.eventId ?? undefined,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
    });
    if (res.ok && res.data?.url) {
      window.location.href = res.data.url;
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range">
          {ANALYTICS_PRESETS.filter((p) => p !== "custom").map((p) => (
            <Link
              key={p}
              href={analyticsHref(basePath, filters, {
                preset: p as AnalyticsPreset,
                from: null,
                to: null,
              })}
              className={buttonClass(filters.preset === p ? "primary" : "secondary", "sm")}
            >
              {PRESET_LABELS[p]}
            </Link>
          ))}
          <button
            type="button"
            className={buttonClass(filters.preset === "custom" ? "primary" : "secondary", "sm")}
            onClick={() => go({ preset: "custom" })}
          >
            Custom
          </button>
        </div>

        {filters.preset === "custom" ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              go({
                preset: "custom",
                from: String(fd.get("from") || "") || null,
                to: String(fd.get("to") || "") || null,
              });
            }}
          >
            <label className="text-xs text-ink-soft">
              From
              <input
                name="from"
                type="date"
                defaultValue={filters.from ?? ""}
                className="mt-1 block rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <label className="text-xs text-ink-soft">
              To
              <input
                name="to"
                type="date"
                defaultValue={filters.to ?? ""}
                className="mt-1 block rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <button type="submit" className={buttonClass("primary", "sm")}>
              Apply
            </button>
          </form>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ink-soft">
            Event
            <select
              className="mt-1 block max-w-xs rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
              value={filters.eventId ?? "all"}
              onChange={(e) => {
                const v = e.target.value;
                startTransition(() => go({ eventId: v === "all" ? null : v }));
              }}
            >
              <option value="all">All events</option>
              {eventOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </label>
          <p className="pt-5 text-sm text-ink-soft tabular-nums">{rangeLabel}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void onExport())}
        className={buttonClass("primary", "md")}
      >
        Export xlsx
      </button>
    </div>
  );
}
