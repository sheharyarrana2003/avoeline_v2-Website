"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import { formatCurrencyCompact } from "@/src/lib/money";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";
import {
  sortEventRows,
  totalsFromEventRows,
  type AnalyticsEventRow,
  type EventSortKey,
} from "@/src/features/analytics/analyticsDerive";
import { analyticsHref, type AnalyticsFilters } from "@/src/features/analytics/analytics.filters";

function SortBtn({
  label,
  active,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-medium uppercase tracking-wide ${active ? "text-ink" : "text-ink-soft"} hover:text-ink ${
        align === "right" ? "w-full text-right" : "text-left"
      }`}
    >
      {label}
    </button>
  );
}

export default function EventPerformanceTable({
  rows,
  basePath,
  filters,
}: {
  rows: AnalyticsEventRow[];
  basePath: string;
  filters: AnalyticsFilters;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<EventSortKey>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => sortEventRows(rows, sortKey, dir), [rows, sortKey, dir]);
  const totals = useMemo(() => totalsFromEventRows(rows), [rows]);

  function toggle(key: EventSortKey) {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("desc");
    }
  }

  if (!rows.length) {
    return (
      <div className="p-6">
        <EmptyState
          size="sm"
          icon={<CalendarDays size={24} />}
          title="No events to measure"
          description="Publish an event and its registrations and revenue will be summarised here."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <caption className="sr-only">Event performance</caption>
        <thead>
          <tr>
            <th className={`${tableHead} pl-5 pt-4`}>Event</th>
            <th className={`${tableHead} pt-4`}>Type</th>
            <th className={`${tableHead} pt-4`}>
              <SortBtn label="Date" active={sortKey === "date"} onClick={() => toggle("date")} />
            </th>
            <th className={`${tableHead} pt-4 text-right`}>
              <SortBtn
                label="Regs"
                active={sortKey === "registrations"}
                onClick={() => toggle("registrations")}
                align="right"
              />
            </th>
            <th className={`${tableHead} pt-4 text-right`}>
              <SortBtn
                label="Check-in"
                active={sortKey === "checkIn"}
                onClick={() => toggle("checkIn")}
                align="right"
              />
            </th>
            <th className={`${tableHead} pt-4`}>
              <SortBtn
                label="Satisfaction"
                active={sortKey === "satisfaction"}
                onClick={() => toggle("satisfaction")}
              />
            </th>
            <th className={`${tableHead} pt-4 text-right`}>
              <SortBtn
                label="Revenue"
                active={sortKey === "revenue"}
                onClick={() => toggle("revenue")}
                align="right"
              />
            </th>
            <th className={`${tableHead} pt-4 text-right`}>
              <SortBtn
                label="Costs"
                active={sortKey === "costs"}
                onClick={() => toggle("costs")}
                align="right"
              />
            </th>
            <th className={`${tableHead} pr-5 pt-4 text-right`}>
              <SortBtn
                label="Net"
                active={sortKey === "net"}
                onClick={() => toggle("net")}
                align="right"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr
              key={e.id}
              className={`${tableRow} cursor-pointer`}
              onClick={() => router.push(analyticsHref(basePath, filters, { eventId: e.id }))}
            >
              <td className={`${tableCell} max-w-[280px] pl-5`}>
                <EventThumb title={e.eventName} src={e.bannerUrl} size="sm" showTitle />
              </td>
              <td className={tableCell}>
                <span className="text-ink-soft">{e.eventType}</span>
              </td>
              <td className={`${tableCell} whitespace-nowrap tabular-nums text-ink-soft`}>
                {e.date}
              </td>
              <td className={`${tableCell} text-right tabular-nums`}>
                {e.registrations.toLocaleString("en-US")}
              </td>
              <td className={`${tableCell} text-right tabular-nums`}>
                {e.checkInRate == null ? (
                  <span className="text-ink-faint">—</span>
                ) : (
                  `${e.checkInRate}%`
                )}
              </td>
              <td className={tableCell}>
                {e.avgSatisfaction != null && e.avgSatisfaction > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <StarRating rating={e.avgSatisfaction} />
                    <span className="text-xs text-ink-soft tabular-nums">
                      {e.avgSatisfaction.toFixed(1)}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </td>
              <td className={`${tableCell} text-right tabular-nums`}>
                {formatCurrencyCompact(e.revenue)}
              </td>
              <td className={`${tableCell} text-right tabular-nums text-ink-soft`}>
                {e.totalCosts > 0 ? (
                  formatCurrencyCompact(e.totalCosts)
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </td>
              <td
                className={`${tableCell} pr-5 text-right tabular-nums ${
                  e.netAfterCosts < 0 ? "text-danger" : "text-ink"
                }`}
              >
                {formatCurrencyCompact(e.netAfterCosts)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-muted/40">
            <td className={`${tableCell} pl-5 font-medium text-ink`} colSpan={3}>
              Totals
            </td>
            <td className={`${tableCell} text-right font-medium tabular-nums`}>
              {totals.registrations.toLocaleString("en-US")}
            </td>
            <td className={`${tableCell} text-right tabular-nums text-ink-soft`}>
              {totals.checkedIn.toLocaleString("en-US")}
            </td>
            <td className={tableCell} />
            <td className={`${tableCell} text-right font-medium tabular-nums`}>
              {formatCurrencyCompact(totals.revenue)}
            </td>
            <td className={`${tableCell} text-right tabular-nums text-ink-soft`}>
              {formatCurrencyCompact(totals.totalCosts)}
            </td>
            <td className={`${tableCell} pr-5 text-right font-medium tabular-nums`}>
              {formatCurrencyCompact(totals.netAfterCosts)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
