import Link from "next/link";
import { RecentRegistration } from "@/src/features/dashboard/types";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { Users } from "lucide-react";

function AttendeeCell({ row }: { row: RecentRegistration }) {
  const primary = row.isTeam && row.teamName ? row.teamName : row.attendeeName || "Attendee";
  const secondary = row.isTeam
    ? [
        row.competitionName,
        row.memberCount != null
          ? `${row.memberCount} ${row.memberCount === 1 ? "member" : "members"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : row.attendeeEmail || undefined;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted-strong text-2xs font-medium text-ink"
          aria-hidden="true"
        >
          {(primary.charAt(0) || "A").toUpperCase()}
        </span>
        <CellStack primary={primary} secondary={secondary || undefined} />
      </div>
      {row.isTeam && row.members && row.members.length > 0 ? (
        <details className="mt-1.5 pl-10">
          <summary className="cursor-pointer text-2xs text-ink-soft hover:text-ink">
            Show members
          </summary>
          <ul className="mt-1 space-y-0.5 text-2xs text-ink-soft">
            {row.members.map((m, i) => (
              <li key={`${m.email || m.name}-${i}`} className="truncate">
                {m.name || "Attendee"}
                {m.email ? ` · ${m.email}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function buildColumns(): Column<RecentRegistration>[] {
  return [
    {
      key: "attendee",
      header: "Attendee",
      width: "w-[34%] max-w-0",
      cell: (r) => (
        <Link
          href={r.href}
          className="block min-w-0 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <AttendeeCell row={r} />
        </Link>
      ),
    },
    {
      key: "event",
      header: "Event",
      width: "w-[36%] max-w-0",
      cell: (r) => (
        <Link
          href={r.href}
          className="block min-w-0 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <EventThumb title={r.eventName || "—"} src={r.eventBanner} size="sm" />
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => <span className="whitespace-nowrap">{formatCurrency(r.amountPaid)}</span>,
    },
  ];
}

export default function RecentRegistrations({
  registerations,
  organizerId,
}: {
  registerations: RecentRegistration[];
  organizerId: string;
}) {
  void organizerId;
  return (
    <DataTable
      caption="The most recent registrations across your events"
      rows={registerations}
      columns={buildColumns()}
      getKey={(r) => r.id}
      empty={
        <EmptyState
          size="sm"
          icon={<Users className="h-5 w-5" />}
          title="No registrations yet"
          description="Attendees who sign up for your events will appear here."
        />
      }
    />
  );
}
