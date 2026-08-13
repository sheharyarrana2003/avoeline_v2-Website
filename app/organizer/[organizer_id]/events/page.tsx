import { EventService } from "@/src/services/event.service";
import { EventModel, EventStatus } from "@/src/services/models/event.model";
import { Calendar, CalendarPlus, Eye, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/src/lib/datetime";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
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

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
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

                <nav className="flex gap-7 overflow-x-auto border-b border-line" aria-label="Event status filters">
                    {tabs.map((tab) => {
                        const isActive = currentTab === tab.value;

                        return (
                            <Link
                                key={tab.value}
                                href={tab.href}
                                className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition ${isActive
                                        ? "border-ink text-ink"
                                        : "border-transparent text-ink-soft hover:text-ink"
                                    }`}
                            >
                                {tab.label} <span className="tabular-nums">({tab.count})</span>
                            </Link>
                        );
                    })}
                </nav>

                <section className="pt-8">
                    <h2 className="mb-5 font-display text-xl text-ink">
                        {currentTab === "all" ? "All Events" : `${toTitleCase(currentTab)} Events`}
                    </h2>

                    {events.length === 0 ? (
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
                    ) : (
                        <ul className="space-y-4">
                            {events.map((event) => (
                                <li
                                    key={event.id}
                                    className="rounded-2xl border border-line bg-paper p-5 transition hover:border-line-loud"
                                >
                                    <article className="flex items-center gap-5">
                                        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-semibold uppercase text-ink-invert">
                                            {event.category.slice(0, 2)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="rounded-md bg-muted px-2 py-1 text-2xs font-medium uppercase text-ink-soft">
                                                    {event.category}
                                                </span>
                                                <StatusBadge status={event.status} size="sm" />
                                            </div>
                                            <h3 className="truncate text-base font-semibold text-ink">{event.title}</h3>
                                            <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{event.description}</p>
                                        </div>

                                        <div className="shrink-0 space-y-2 text-sm text-ink-soft">
                                            <p className="flex items-center gap-2 tabular-nums">
                                                {/* gray-400 = 2.5:1, decoration only — the date beside it carries the meaning. */}
                                                <Calendar size={16} className="text-ink-faint" aria-hidden="true" />
                                                {formatDate(event.schedule.startDate)}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <MapPin size={16} className="text-ink-faint" aria-hidden="true" />
                                                {event.location.venueName}
                                            </p>
                                        </div>

                                        <div className="w-[200px] shrink-0">
                                            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                                                <span className="font-medium text-ink tabular-nums">
                                                    {event.analytics.registrations}/{event.capacity.totalSeats}
                                                </span>
                                                <span className="text-ink-soft">registered</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-muted-strong">
                                                <div
                                                    className="h-full rounded-full bg-ink"
                                                    style={{ width: `${getProgress(event)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <Link
                                            href={`${base_address}/events/${event.id}`}
                                            className={buttonClass("ghost", "sm", "shrink-0")}
                                            aria-label={`View ${event.title}`}
                                        >
                                            <Eye size={18} aria-hidden="true" />
                                        </Link>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

function countByStatus(events: EventModel[], status: EventStatus) {
    return events.filter((event) => event.status === status).length;
}

function getProgress(event: EventModel) {
    if (event.capacity.totalSeats <= 0) {
        return 0;
    }

    return Math.min(100, Math.round((event.analytics.registrations / event.capacity.totalSeats) * 100));
}

function toTitleCase(value: string) {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
