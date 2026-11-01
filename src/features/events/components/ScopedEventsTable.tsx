import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { DataTable, type Column } from "@/src/shared_components/ui/DataTable";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { eventLifecycle } from "@/src/lib/eventState";
import type { DeptEventRow } from "@/src/features/department/department.service";

type Props = {
  rows: DeptEventRow[];
  /** When set, show Manage for department-owned rows. */
  manageBase?: string | null;
};

export function ScopedEventsTable({ rows, manageBase }: Props) {
  const columns: Column<DeptEventRow>[] = [
    {
      key: "event",
      header: "Event",
      cell: (row) => (
        <Link
          href={`/events/${row.id}`}
          className="flex items-center gap-3 font-medium text-ink hover:underline"
        >
          <EventThumb title={row.title} src={row.bannerUrl} size="md" />
          <span className="min-w-0">
            <span className="block truncate">{row.title}</span>
            {row.shortDescription ? (
              <span className="mt-0.5 block truncate text-xs font-normal text-ink-soft">
                {row.shortDescription}
              </span>
            ) : null}
          </span>
        </Link>
      ),
    },
    {
      key: "org",
      header: "Organization",
      cell: (row) =>
        row.source === "department" ? (
          <span className="text-sm text-ink">Department</span>
        ) : (
          <span className="text-sm text-ink">{row.clubName || "Club"}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={eventLifecycle(row.status, {
            startDate: row.startDate,
            endDate: row.endDate,
            startTime: row.startTime,
          })}
          size="sm"
        />
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-ink">
          {formatDate(row.startDate)}
        </span>
      ),
    },
    {
      key: "regs",
      header: "Registrations",
      align: "right",
      cell: (row) => <span className="tabular-nums">{row.registrations}</span>,
    },
    {
      key: "act",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/events/${row.id}`} className={buttonClass("ghost", "sm")}>
            View
          </Link>
          {manageBase && row.source === "department" ? (
            <Link
              href={`${manageBase}/events/${row.id}`}
              className={buttonClass("secondary", "sm")}
            >
              Manage
            </Link>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      caption={`${rows.length} event${rows.length === 1 ? "" : "s"}`}
      rows={rows}
      columns={columns}
      getKey={(r) => r.id}
      empty={
        <EmptyState
          size="sm"
          icon={<CalendarDays className="h-5 w-5" />}
          title="No events yet"
          description="Create a department event, or wait for clubs to publish theirs."
        />
      }
    />
  );
}
