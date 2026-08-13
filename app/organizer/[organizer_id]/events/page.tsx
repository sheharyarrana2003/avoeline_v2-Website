import { EventService } from "@/src/services/event.service";
import { EventModel, EventStatus } from "@/src/services/models/event.model";
import { CalendarPlus, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Card } from "@/src/shared_components/ui/Card";
import { Breadcrumbs } from "@/src/shared_components/ui/Breadcrumbs";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { Meter } from "@/src/shared_components/ui/charts/Meter";
import { buttonClass } from "@/src/lib/ui";

export default async function MyEventsPage({ params, searchParams }: { params: Promise<{ organizer_id: string }>, searchParams: Promise<{ status?: string }> }) {
    const resolvedParams = await searchParams;
    const currentTab = resolvedParams.status || "all";

    const organizer_id :string = (await params).organizer_id;
    const base_address :string = `/organizer/${organizer_id}`
    const organizerEvents : EventModel[]= await EventService.getAllEventsByOrganizer(organizer_id);

    const events = organizerEvents.filter((event) => {
        if (currentTab === "all") {
            return true;
        }

        if (currentTab === "published") {
            return event.status === "published" ;
        }

        return event.status === currentTab;
    });

    const tabs = [
        { label: "All Events", value: "all", count: organizerEvents.length, href: `${base_address}/events` },
        { label: "Draft", value: "draft", count: countByStatus(organizerEvents, "draft"), href: `${base_address}/events?status=draft` },
        {
            label: "Published",
            value: "published",
            count: countByStatus(organizerEvents, "published"),
            href: `${base_address}/events?status=published`
        },
        { label: "Ongoing", value: "ongoing", count: countByStatus(organizerEvents, "ongoing"), href: `${base_address}/events?status=ongoing` },
        { label: "Completed", value: "completed", count: countByStatus(organizerEvents, "completed"), href: `${base_address}/events?status=completed` },
        { label: "Cancelled", value: "cancelled", count: countByStatus(organizerEvents, "cancelled"), href: `${base_address}/events?status=cancelled` },
    ];

    const columns: Column<EventModel>[] = [
        {
            key: "event",
            header: "Event",
            cell: (e) => (
                <Link href={`${base_address}/events/${e.id}`} className="group/row block min-w-48 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                    <CellStack
                        primary={<span className="group-hover/row:underline">{e.title}</span>}
                        secondary={[e.category, e.format, e.eventType].filter(Boolean).join(" · ")}
                    />
                </Link>
            ),
        },
        { key: "status", header: "Status", cell: (e) => <StatusBadge status={e.status} size="sm" /> },
        {
            key: "date",
            header: "Date",
            cell: (e) => (
                <CellStack
                    primary={<span className="tabular-nums font-normal">{formatDate(e.schedule?.startDate)}</span>}
                    // startTime was stored and never shown on this list.
                    secondary={e.schedule?.startTime ? formatTime(e.schedule.startTime) : undefined}
                />
            ),
        },
        {
            key: "venue",
            header: "Venue",
            cell: (e) => (
                <CellStack
                    primary={<span className="font-normal">{e.location?.venueName || "—"}</span>}
                    secondary={e.location?.city}
                />
            ),
        },
        {
            key: "registered",
            header: "Registered",
            cell: (e) => (
                <Meter
                    compact
                    label={`Registered for ${e.title}`}
                    value={e.analytics?.registrations ?? 0}
                    max={e.capacity?.totalSeats ?? 0}
                />
            ),
        },
        {
            key: "checkedIn",
            header: "Checked in",
            align: "right",
            cell: (e) => e.analytics?.checkIns ?? 0,
        },
        {
            key: "views",
            header: "Views",
            align: "right",
            cell: (e) => e.analytics?.views ?? 0,
        },
        {
            key: "revenue",
            header: "Revenue",
            align: "right",
            cell: (e) => formatCurrency(e.analytics?.revenue, e.pricing?.currency, "—"),
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (e) => (
                <Link
                    href={`${base_address}/events/${e.id}`}
                    className={buttonClass("ghost", "sm")}
                    aria-label={`View ${e.title}`}
                >
                    <Eye size={16} aria-hidden="true" />
                </Link>
            ),
        },
    ];

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <Breadcrumbs items={[{ label: "Dashboard", href: `${base_address}/dashboard` }, { label: "Events" }]} />
                <PageHeader
                    title="My Events"
                    description={`${organizerEvents.length} total events`}
                    actions={
                        <Link href={`${base_address}/events/create`} className={buttonClass("primary", "lg")}>
                            <Plus size={16} aria-hidden="true" />
                            Create New Event
                        </Link>
                    }
                />

                <FilterTabs tabs={tabs} activeValue={currentTab} label="Event status filters" />

                {/* A table, where this was a stack of 132px cards showing six facts
                    each. EventModel carries a whole analytics block — views, check-ins,
                    revenue, completion rate — and the cards rendered exactly one of
                    them. Nothing below is a new read; it is the same document. */}
                <Card>
                    <DataTable
                        caption={currentTab === "all" ? "All events" : `${toTitleCase(currentTab)} events`}
                        rows={events}
                        columns={columns}
                        getKey={(e) => e.id}
                        empty={
                            <div className="p-6">
                                <EmptyState
                                    icon={<CalendarPlus size={28} />}
                                    title={currentTab === "all" ? "No events yet" : `No ${toTitleCase(currentTab).toLowerCase()} events`}
                                    description={
                                        currentTab === "all"
                                            ? "Create your first event to start taking registrations."
                                            : "Nothing sits in this status right now. Try another filter, or create an event."
                                    }
                                    action={
                                        <Link href={`${base_address}/events/create`} className={buttonClass()}>
                                            <Plus size={16} aria-hidden="true" />
                                            Create New Event
                                        </Link>
                                    }
                                />
                            </div>
                        }
                    />
                </Card>
            </div>
        </div>
    );
}

function countByStatus(events: EventModel[], status: EventStatus) {
    return events.filter((event) => event.status === status).length;
}

function toTitleCase(value: string) {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
