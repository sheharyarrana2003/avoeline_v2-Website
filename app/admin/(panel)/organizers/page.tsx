import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { formatDateMedium } from "@/src/lib/datetime";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listOrganizers } from "@/src/features/admin/admin.service";
import type { OrganizerRow } from "@/src/features/admin/types";

/**
 * Spec 9.3: every organizer, with signup date, events run and account status.
 *
 * Filter and search go through the query string, matching the organizer's own
 * events table rather than the simpler tab-only pattern the category page uses
 * — `SearchField`'s `keep` prop is what stops a search resetting the tab.
 */
export default async function AdminOrganizersPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; q?: string }>;
}) {
    if (!(await requireAdminArea("organizers"))) notFound();

    const sp = await searchParams;
    const tab = sp.status === "suspended" || sp.status === "active" ? sp.status : "all";
    const query = (sp.q ?? "").trim();

    const all = await listOrganizers();
    const byStatus =
        tab === "all" ? all : all.filter((o) => (tab === "suspended" ? o.accountStatus !== "active" : o.accountStatus === "active"));
    const rows = query
        ? byStatus.filter((o) =>
              [o.name, o.email].some((field) => field.toLowerCase().includes(query.toLowerCase())),
          )
        : byStatus;

    const suspendedCount = all.filter((o) => o.accountStatus !== "active").length;
    const tabs = [
        { label: "All", value: "all", href: `/admin/organizers${query ? `?q=${encodeURIComponent(query)}` : ""}`, count: all.length },
        { label: "Active", value: "active", href: `/admin/organizers?status=active${query ? `&q=${encodeURIComponent(query)}` : ""}`, count: all.length - suspendedCount },
        { label: "Suspended", value: "suspended", href: `/admin/organizers?status=suspended${query ? `&q=${encodeURIComponent(query)}` : ""}`, count: suspendedCount },
    ];

    const columns: Column<OrganizerRow>[] = [
        {
            key: "organizer",
            header: "Organizer",
            cell: (row) => (
                <CellStack
                    primary={
                        <Link href={`/admin/organizers/${row.organizerId}`} className="font-medium text-ink hover:underline">
                            {row.name}
                        </Link>
                    }
                    secondary={row.email || "no email on file"}
                />
            ),
        },
        {
            key: "signedUp",
            header: "Signed up",
            cell: (row) => (row.signedUpAt ? formatDateMedium(row.signedUpAt) : "—"),
        },
        {
            key: "events",
            header: "Events",
            align: "right",
            cell: (row) => (
                <CellStack
                    primary={`${row.eventCount}`}
                    secondary={row.eventCount ? `${row.liveEventCount} live` : "none yet"}
                />
            ),
        },
        {
            key: "status",
            header: "Account",
            align: "right",
            cell: (row) => <StatusBadge status={row.accountStatus} size="sm" />,
        },
    ];

    return (
        <>
            <PageHeader
                title="Organizers"
                description="Everyone running events on Avoeline. Suspending an account hides its public events immediately."
            />

            <div className="mb-6">
                <SearchField
                    action="/admin/organizers"
                    placeholder="Search by name or email"
                    defaultValue={query}
                    keep={{ status: tab === "all" ? undefined : tab }}
                    label="Search organizers"
                />
            </div>

            <FilterTabs tabs={tabs} activeValue={tab} label="Organizer account filters" />

            <div className="mt-6">
                <DataTable
                    caption={`${rows.length} organizer${rows.length === 1 ? "" : "s"}`}
                    rows={rows}
                    columns={columns}
                    getKey={(row) => row.organizerId}
                    empty={
                        <EmptyState
                            size="sm"
                            icon={<Users className="h-5 w-5" />}
                            title={query ? "No organizer matches that" : "No organizers yet"}
                            description={query ? "Try part of a name or email address." : "Accounts appear here as people sign up."}
                        />
                    }
                />
            </div>
        </>
    );
}
