import { RecentRegistration } from "@/src/features/dashboard/types";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { Users } from "lucide-react";

/**
 * This file is why DataTable exists. It had the table recipe from `src/lib/ui.ts`
 * re-typed inline rather than imported, so the shared strings had three users and a
 * fourth copy sitting right here drifting away from them.
 */
const columns: Column<RecentRegistration>[] = [
  {
    key: "attendee",
    header: "Attendee",
    cell: (r) => (
      <div className="flex items-center gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted-strong text-2xs font-medium text-ink"
          aria-hidden="true"
        >
          {r.attendeeName.charAt(0)}
        </span>
        <CellStack primary={r.attendeeName} />
      </div>
    ),
  },
  { key: "event", header: "Event", cell: (r) => <span className="text-ink-soft">{r.eventName}</span> },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} size="sm" /> },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    cell: (r) => <span className="whitespace-nowrap">{formatCurrency(r.amountPaid)}</span>,
  },
];

export default function RecentRegistrations({ registerations }: { registerations: RecentRegistration[] }) {
  return (
    <DataTable
      caption="The ten most recent registrations across your events"
      rows={registerations}
      columns={columns}
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
