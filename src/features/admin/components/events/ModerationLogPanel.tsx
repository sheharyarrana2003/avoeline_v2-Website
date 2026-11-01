"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { adminEventsHref } from "@/src/features/admin/eventModeration.filters";
import {
  LOG_ACTIONS,
  type AdminEventFilters,
  type LogActionFilter,
  type ModerationLogRow,
} from "@/src/features/admin/eventModeration.types";
import { MultiSelectPopover } from "./MultiSelectPopover";

const ACTION_LABEL: Record<string, string> = {
  unpublished: "Unpublish",
  restored: "Restore",
  removed: "Remove",
  report_dismissed: "Dismiss report",
};

export function ModerationLogPanel({
  rows,
  filters,
  nextCursor,
}: {
  rows: ModerationLogRow[];
  filters: AdminEventFilters;
  nextCursor: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.logQ);

  const push = (next: Partial<AdminEventFilters>) => {
    startTransition(() => {
      router.push(adminEventsHref(filters, { tab: "log", logCursor: null, ...next }));
    });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className={labelClass} htmlFor="log-q">
            Search event or reason
          </label>
          <input
            id="log-q"
            className={fieldClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ logQ: q.trim() });
            }}
          />
        </div>
        <MultiSelectPopover
          label="Action"
          options={LOG_ACTIONS.map((a) => ({ value: a, label: ACTION_LABEL[a] || a }))}
          selected={filters.logAction}
          onChange={(next) => push({ logAction: next as LogActionFilter[] })}
        />
        <div>
          <label className={labelClass} htmlFor="log-admin">
            Admin
          </label>
          <input
            id="log-admin"
            className={fieldClass}
            defaultValue={filters.logAdmin}
            placeholder="Email contains…"
            onBlur={(e) => push({ logAdmin: e.target.value.trim() })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="log-from">
            From
          </label>
          <input
            id="log-from"
            type="date"
            className={fieldClass}
            defaultValue={filters.logFrom}
            onChange={(e) => push({ logFrom: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="log-to">
            To
          </label>
          <input
            id="log-to"
            type="date"
            className={fieldClass}
            defaultValue={filters.logTo}
            onChange={(e) => push({ logTo: e.target.value })}
          />
        </div>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          disabled={pending}
          onClick={() => push({ logQ: q.trim() })}
        >
          Apply
        </button>
      </div>

      {!rows.length ? (
        <EmptyState
          size="sm"
          title="No moderation entries"
          description="Actions taken here will appear in this log."
        />
      ) : (
        <div className="overflow-auto rounded-xl border border-line">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-paper">
              <tr className="border-b border-line text-2xs uppercase text-ink-faint">
                <th className="px-3 py-2.5 font-medium">Time</th>
                <th className="px-3 py-2.5 font-medium">Admin</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Reason</th>
                <th className="px-3 py-2.5 font-medium">Notified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                    {formatDateMedium(row.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm text-ink">{row.adminEmail}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={row.action} size="sm" label={ACTION_LABEL[row.action]} />
                  </td>
                  <td className="px-3 py-2.5">
                    {row.targetType === "event" ? (
                      <Link href={`/e/${row.targetId}`} className="block min-w-0">
                        <EventThumb title={row.targetLabel} src={row.bannerImage} size="sm" />
                      </Link>
                    ) : (
                      <span className="text-sm">{row.targetLabel}</span>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-2.5 text-ink-soft">
                    <span className="line-clamp-2 whitespace-pre-wrap">{row.reason}</span>
                  </td>
                  <td className="px-3 py-2.5 text-2xs uppercase text-ink-faint">
                    {row.notified ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => push({ logCursor: nextCursor })}
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
