"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, MoreHorizontal, Shield } from "lucide-react";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { formatDate, formatTime, timeAgo } from "@/src/lib/datetime";
import { eventLifecycle } from "@/src/lib/eventState";
import { adminEventsHref, formatHostLine2 } from "@/src/features/admin/eventModeration.filters";
import type {
  AdminEventFilters,
  AdminModerationEventRow,
} from "@/src/features/admin/eventModeration.types";
import { CalendarDays } from "lucide-react";
import { toDate } from "@/src/lib/datetime";

function relativeSchedule(start: string | null): string {
  const d = toDate(start);
  if (!d) return "";
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (days > 21) return `in ${Math.round(days / 7)} weeks`;
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days > -21) return `${Math.abs(days)} days ago`;
  return timeAgo(start);
}

const VIS_LABEL: Record<string, string> = {
  public: "Public",
  private: "Private",
  invite_only: "Invite only",
  hybrid: "Hybrid",
  tiered: "Tiered",
};

function publicationStatus(row: AdminModerationEventRow): string {
  if (row.moderationUnpublished) return "unpublished";
  return row.status || "draft";
}

function RowMenu({ row, onModerate }: { row: AdminModerationEventRow; onModerate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/e/${row.id}` : `/e/${row.id}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={buttonClass("ghost", "sm")}
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-paper py-1 shadow-lg">
          <Link
            href={`/e/${row.id}`}
            target="_blank"
            className="block px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Open in admin preview
          </Link>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicUrl);
              } catch {
                /* ignore */
              }
              setOpen(false);
            }}
          >
            Copy public link
          </button>
          <Link
            href={`/admin/organizers/${row.organizerId}`}
            className="block px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            View organizer
          </Link>
          <Link
            href={`/admin/events?tab=log&logQ=${encodeURIComponent(row.title)}`}
            className="block px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            View moderation history
          </Link>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onModerate();
            }}
          >
            Moderate…
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RegBar({ count, total }: { count: number; total: number | null }) {
  const pct = total && total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  return (
    <div className="min-w-[5.5rem]">
      <div className="text-sm tabular-nums text-ink">
        {count}
        {total != null && total > 0 ? <span className="text-ink-faint"> / {total}</span> : null}
      </div>
      {total != null && total > 0 ? (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-ink/70" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function EventsTable({
  rows,
  filters,
  nextCursor,
  canModerate,
  onModerate,
  onClearFilters,
}: {
  rows: AdminModerationEventRow[];
  filters: AdminEventFilters;
  nextCursor: string | null;
  canModerate: boolean;
  onModerate: (row: AdminModerationEventRow) => void;
  onClearFilters: () => void;
}) {
  const router = useRouter();

  if (!rows.length) {
    return (
      <EmptyState
        size="sm"
        icon={<CalendarDays className="h-5 w-5" />}
        title="Nothing matches those filters"
        description="Clear filters or try a different search."
        action={
          <button type="button" className={buttonClass("secondary", "sm")} onClick={onClearFilters}>
            Clear filters
          </button>
        }
      />
    );
  }

  return (
    <div className="mt-4">
      {/* Desktop table */}
      <div className="hidden overflow-auto rounded-xl border border-line md:block">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-paper">
            <tr className="border-b border-line text-2xs uppercase tracking-wide text-ink-faint">
              <th className="w-[22rem] px-3 py-2.5 font-medium">Event</th>
              <th className="w-[14rem] px-3 py-2.5 font-medium">Organizer / Dept / Club</th>
              <th className="w-[10rem] px-3 py-2.5 font-medium">Status</th>
              <th className="w-[10rem] px-3 py-2.5 font-medium">Dates</th>
              <th className="w-[7rem] px-3 py-2.5 font-medium">Visibility</th>
              <th className="w-[7rem] px-3 py-2.5 font-medium">Registrations</th>
              <th className="w-[10rem] px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const life = eventLifecycle(row.status, {
                startDate: row.startDate,
                endDate: row.endDate,
                startTime: row.startTime,
                endTime: row.endTime,
              });
              const timing =
                life === "upcoming" || life === "ongoing" || life === "completed" ? life : null;
              const host2 = formatHostLine2(row.host);
              const subtitle = [row.categoryLabel, row.format].filter(Boolean).join(" · ");
              return (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/e/${row.id}`}
                      className="block min-w-0 rounded-xs focus-visible:outline-2"
                    >
                      <EventThumb
                        title={row.title}
                        src={row.bannerImage}
                        size="wide"
                        category={row.categoryLabel}
                        subtitle={subtitle || null}
                      />
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm text-ink">{row.host.organizerName}</div>
                    {host2 ? <div className="text-2xs text-ink-faint">{host2}</div> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={publicationStatus(row)} size="sm" />
                      {timing ? <StatusBadge status={timing} size="sm" /> : null}
                      {row.openReportCount > 0 ? (
                        <StatusBadge
                          status="reported"
                          size="sm"
                          label={`Reported (${row.openReportCount})`}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">
                    {row.startDate ? (
                      <>
                        <div>
                          {formatDate(row.startDate)}
                          {row.startTime ? ` · ${formatTime(row.startTime)}` : ""}
                        </div>
                        {row.endDate ? (
                          <div className="text-2xs">
                            → {formatDate(row.endDate)}
                            {row.endTime ? ` · ${formatTime(row.endTime)}` : ""}
                          </div>
                        ) : null}
                        <div className="text-2xs text-ink-faint">
                          {relativeSchedule(row.startDate)}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-2xs uppercase text-ink-soft">
                      {VIS_LABEL[row.visibility] || row.visibility}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <RegBar count={row.registrationsCount} total={row.totalSeats} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/e/${row.id}`}
                        className={buttonClass("ghost", "sm")}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                      {canModerate ? (
                        <button
                          type="button"
                          className={buttonClass("secondary", "sm")}
                          onClick={() => onModerate(row)}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          Moderate
                        </button>
                      ) : null}
                      <RowMenu row={row} onModerate={() => onModerate(row)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => {
          const subtitle = [row.categoryLabel, row.format].filter(Boolean).join(" · ");
          return (
            <li key={row.id} className="rounded-xl border border-line p-3">
              <Link href={`/e/${row.id}`}>
                <EventThumb
                  title={row.title}
                  src={row.bannerImage}
                  size="wide"
                  category={row.categoryLabel}
                  subtitle={subtitle || null}
                />
              </Link>
              <p className="mt-2 text-sm text-ink-soft">{row.host.organizerName}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <StatusBadge status={publicationStatus(row)} size="sm" />
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/e/${row.id}`} className={buttonClass("ghost", "sm")}>
                  View
                </Link>
                {canModerate ? (
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={() => onModerate(row)}
                  >
                    Moderate
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {nextCursor ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => router.push(adminEventsHref(filters, { cursor: nextCursor }))}
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
