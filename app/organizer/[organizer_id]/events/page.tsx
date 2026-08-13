import { EventService } from "@/src/services/event.service";
import { AnalyticsService } from "@/src/services/anaylService";
import { EventModel } from "@/src/services/models/event.model";
import { eventLifecycle, type EventLifecycle } from "@/src/lib/eventState";
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
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { matchesQuery, normalizeQuery } from "@/src/lib/search";

export default async function MyEventsPage({ params, searchParams }: { params: Promise<{ organizer_id: string }>, searchParams: Promise<{ status?: string; q?: string }> }) {
    const resolvedParams = await searchParams;
    const currentTab = resolvedParams.status || "all";
    const query = normalizeQuery(resolvedParams.q);

    const organizer_id :string = (await params).organizer_id;
    const base_address :string = `/organizer/${organizer_id}`

    // Registrations, check-ins and revenue come from the registrations collection,
    // not from event.analytics.*. Nothing in this codebase writes that block — grep
    // it, there is not one update against it — so its counters are whatever seeding
    // left behind. Reading them here made this list disagree with each event's own
    // detail page, which has always derived these live.
    const [organizerEvents, tallies] = await Promise.all([
        EventService.getAllEventsByOrganizer(organizer_id) as Promise<EventModel[]>,
        AnalyticsService.getEventTallies(organizer_id),
    ]);
    const tallyFor = (id: string) => tallies.get(id) ?? { registrations: 0, checkedIn: 0, revenue: 0, avgRating: 0 };

    // One instant for the whole page, so every event is placed against the same
    // clock rather than drifting across the loop.
    const now = new Date();
    const lifecycleOf = new Map(organizerEvents.map((e) => [e.id, eventLifecycle(e.status, e.schedule, now)]));

    const events = organizerEvents.filter(
        (event) =>
            (currentTab === "all" || lifecycleOf.get(event.id) === currentTab) &&
            matchesQuery(query, [
                event.title,
                event.category,
                event.eventType,
                event.location?.venueName,
                event.location?.city,
            ])
    );

    // One entry per member of EventStatus, derived from the union rather than typed
    // out. `registration_open` had no tab at all: it is a legal status, so such an
    // event was counted in All Events and reachable from no tab, and the per-status
    // counts did not add up to the total. Deriving the list means a status added to
    // the union cannot silently lose its tab again.
    //
    // The `published` branch of the old filter was also dead — it compared status to
    // "published" where the line below it already compared status to currentTab.
    // Tab counts are over the SEARCH results, not the whole collection — a tab
    // reading "4" beside a single visible row is worse than no count.
    const searchable = organizerEvents.filter((event) =>
        matchesQuery(query, [
            event.title,
            event.category,
            event.eventType,
            event.location?.venueName,
            event.location?.city,
        ])
    );

    const STATUS_TABS: { label: string; value: EventLifecycle }[] = [
        { label: "Draft", value: "draft" },
        { label: "Upcoming", value: "upcoming" },
        { label: "Ongoing", value: "ongoing" },
        { label: "Completed", value: "completed" },
        { label: "Unscheduled", value: "published" },
        { label: "Cancelled", value: "cancelled" },
    ];

    const tabs = [
        { label: "All Events", value: "all", count: searchable.length, href: `${base_address}/events${query ? `?q=${encodeURIComponent(query)}` : ""}` },
        ...STATUS_TABS.map((t) => ({
            label: t.label,
            value: t.value,
            count: searchable.filter((e) => lifecycleOf.get(e.id) === t.value).length,
            href: `${base_address}/events?status=${t.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
        })),
    ];

    const columns: Column<EventModel>[] = [
        {
            key: "event",
            header: "Event",
            // Capped, not min-width. Without a ceiling the longest title stretches this
            // column past 600px and pushes revenue and the actions off the table.
            width: "w-[34%] max-w-0",
            cell: (e) => (
                <Link href={`${base_address}/events/${e.id}`} className="group/row block rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                    <CellStack
                        primary={<span className="group-hover/row:underline">{e.title}</span>}
                        // category and eventType only. `format` was here too and it read
                        // as a contradiction: a webinar whose Venue column says "Online"
                        // was labelled "physical", because format comes from the wizard's
                        // locationType picker, which defaults to physical and is easy to
                        // leave untouched. The Venue column already says whether an event
                        // is online, so format beside eventType added nothing but doubt.
                        secondary={[e.category, e.eventType].filter(Boolean).join(" · ")}
                    />
                </Link>
            ),
        },
        {
            key: "status",
            header: "Status",
            // The derived state, not the stored one: the stored value is written once at
            // creation and never again, so a finished event would read "Published".
            cell: (e) => <StatusBadge status={lifecycleOf.get(e.id)} size="sm" />,
        },
        {
            key: "date",
            header: "Date",
            cell: (e) => {
                const date = formatDate(e.schedule?.startDate);
                // A bare "10:00 AM" under an em dash is noise: a draft with no start date
                // still carries a default start time, and a time with no day means nothing.
                const showTime = date !== "—" && e.schedule?.startTime;
                return (
                    <CellStack
                        primary={<span className="whitespace-nowrap font-normal tabular-nums">{date}</span>}
                        secondary={showTime ? formatTime(e.schedule.startTime) : undefined}
                    />
                );
            },
        },
        {
            key: "venue",
            header: "Venue",
            // w-[14%] is load-bearing: max-w-0 on its own resolves the column to zero
            // width, which clipped the venue to a single letter and let the next
            // header slide on top of it.
            width: "w-[14%] max-w-0",
            cell: (e) => {
                // Falls back to the city as the primary line rather than printing an em
                // dash above it — "— / Lahore" reads as missing data twice over.
                const venue = e.location?.venueName;
                return (
                    <CellStack
                        primary={<span className="font-normal">{venue || e.location?.city || "—"}</span>}
                        secondary={venue ? e.location?.city : undefined}
                    />
                );
            },
        },
        {
            key: "registered",
            header: "Registered",
            cell: (e) => (
                <Meter
                    compact
                    label={`Registered for ${e.title}`}
                    value={tallyFor(e.id).registrations}
                    max={e.capacity?.totalSeats ?? 0}
                />
            ),
        },
        {
            key: "checkedIn",
            header: "Checked in",
            align: "right",
            cell: (e) => tallyFor(e.id).checkedIn,
        },
        {
            key: "revenue",
            header: "Revenue",
            align: "right",
            cell: (e) => formatCurrency(tallyFor(e.id).revenue, e.pricing?.currency, "—"),
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
            {/* Wider than the usual 7xl: this table carries nine columns and 7xl left
                ~50px of viewport unused on either side while the cells were squeezed. */}
            <div className="mx-auto max-w-[100rem]">
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

                <div className="mb-4 flex justify-end">
                    <SearchField
                        action={`${base_address}/events`}
                        placeholder="Search events, venue, category"
                        defaultValue={query}
                        keep={{ status: currentTab === "all" ? undefined : currentTab }}
                    />
                </div>

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
                                    title={
                                        query
                                            ? `Nothing matches “${query}”`
                                            : currentTab === "all"
                                              ? "No events yet"
                                              : `No ${toTitleCase(currentTab).toLowerCase()} events`
                                    }
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

function toTitleCase(value: string) {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
