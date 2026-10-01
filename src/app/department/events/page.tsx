import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { DataTable, type Column } from "@/src/shared_components/ui/DataTable";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { CalendarDays } from "lucide-react";
import { listScopedEvents, resolveDepartment, type DeptEventRow } from "@/src/features/department/department.service";

export const metadata = { title: "Department events — Avoeline" };

export default async function DepartmentEventsPage({
    searchParams,
}: {
    searchParams: Promise<{ orgId?: string }>;
}) {
    const { orgId } = await searchParams;
    const { user, department } = await resolveDepartment(orgId);
    const events = await listScopedEvents(department.id, user.userId);

    const columns: Column<DeptEventRow>[] = [
        {
            key: "title",
            header: "Event",
            cell: (row) =>
                row.source === "department" ? (
                    <Link href={`/organizer/${row.organizerId}/events/${row.id}`} className="font-medium text-ink hover:underline">
                        {row.title}
                    </Link>
                ) : (
                    <Link href={`/events/${row.id}`} className="font-medium text-ink hover:underline">
                        {row.title}
                    </Link>
                ),
        },
        {
            key: "source",
            header: "Source",
            cell: (row) => <StatusBadge status={row.source === "department" ? "department" : row.clubName || "club"} size="sm" />,
        },
        {
            key: "act",
            header: "",
            align: "right",
            cell: (row) =>
                row.source === "department" ? (
                    <span className="text-2xs uppercase text-ink-soft">Manage</span>
                ) : (
                    <span className="text-2xs uppercase text-ink-faint">Read only</span>
                ),
        },
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Events"
                description="Department events you can edit. Club events are listed for oversight only — open the public page, not the club's workspace."
                actions={
                    <Link href={`/organizer/${user.userId}/events/create`} className={buttonClass()}>
                        New department event
                    </Link>
                }
            />
            <DataTable
                caption={`${events.length} event${events.length === 1 ? "" : "s"}`}
                rows={events}
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
        </div>
    );
}
