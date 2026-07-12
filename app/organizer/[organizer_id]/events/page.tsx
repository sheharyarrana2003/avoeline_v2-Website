import { AuthService } from "@/src/features/auth/authService";
import { EventService } from "@/src/services/event.service";
import { EventModel, EventStatus } from "@/src/services/models/event.model";
import { CurrentUserData } from "@/src/services/models/user.type";
import { Calendar, Eye, LayoutList, MapPin, MoreVertical, Pencil, Plus } from "lucide-react";
import Link from "next/link";

export default async function MyEventsPage({ params, searchParams }: { params: Promise<{ organizer_id: string }>, searchParams: Promise<{ status?: string }> }) {
    const resolvedParams = await searchParams;
    const currentTab = resolvedParams.status || "all";

    const organizer_id :string = (await params).organizer_id;
    const base_address :string = `/organizer/${organizer_id}`
    const organizerEvents : EventModel[]= await EventService.getAllEventsByOrganizer(organizer_id);
    console.log(`these are the event of this organizer ${organizer_id} ->  ${organizerEvents}`);

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
        <main className="min-h-screen bg-white px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">My Events</h1>
                        <p className="mt-2 text-sm font-bold text-slate-400">{organizerEvents.length} total events</p>
                    </div>

                    <Link
                        href={`${base_address}/events/create`}
                        className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-slate-800"
                    >
                        <Plus size={18} />
                        Create New Event
                    </Link>
                </header>

                <nav className="flex gap-7 overflow-x-auto border-b border-slate-200 pt-5" aria-label="Event status filters">
                    {tabs.map((tab) => {
                        const isActive = currentTab === tab.value;

                        return (
                            <Link
                                key={tab.value}
                                href={tab.href}
                                className={`shrink-0 border-b-2 pb-4 text-sm font-extrabold transition ${isActive
                                        ? "border-black text-slate-950"
                                        : "border-transparent text-slate-400 hover:text-slate-700"
                                    }`}
                            >
                                {tab.label} ({tab.count})
                            </Link>
                        );
                    })}
                </nav>

                <section className="pt-8">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            {currentTab === "all" ? "All Events" : `${toTitleCase(currentTab)} Events`}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
                                <LayoutList size={18} />
                            </span>
                        </div>
                    </div>

                    <ul className="space-y-4">
                        {events.map((event) => (

                            <li
                                key={`${event.id}+${new Date().toISOString()}`}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.035)] transition hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.07)]"
                            >
                                <article className="grid gap-5 lg:grid-cols-[76px_minmax(0,1fr)_minmax(220px,0.45fr)_minmax(260px,0.55fr)_120px] lg:items-center">
                                    <div className="flex size-[76px] items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-500 text-sm font-extrabold uppercase tracking-widest text-white">
                                        {event.category.slice(0, 2)}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-700">
                                                {event.category}
                                            </span>
                                            <StatusBadge status={event.status} />
                                        </div>
                                        <h3 className="truncate text-lg font-extrabold text-slate-950">{event.title}</h3>
                                        <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-400">{event.description}</p>
                                    </div>

                                    <div className="space-y-2 text-sm font-bold text-slate-500">
                                        <p className="flex items-center gap-2">
                                            <Calendar size={16} className="text-slate-400" />
                                            {event.schedule.startDate}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Calendar size={16} className="text-slate-400" />
                                            {event.id}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <MapPin size={16} className="text-slate-400" />
                                            {event.location.venueName}
                                        </p>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-4 text-sm font-extrabold">
                                            <span className="text-slate-950">
                                                {event.analytics.registrations}/{event.capacity.totalSeats}
                                            </span>
                                            <span className="text-slate-400">registered</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-black"
                                                style={{ width: `${getProgress(event)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-start gap-2 lg:justify-end">
                                        <Link
                                            href={`${base_address}/events/${event.id}`}
                                            className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                                            aria-label={`View ${event.title}`}
                                        >
                                            <Eye size={18} />
                                        </Link>
                                        <Link
                                            href={`${base_address}/events/${event.id}`}
                                            className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                                            aria-label={`Edit ${event.title}`}
                                        >
                                            <Pencil size={18} />
                                        </Link>
                                        <button
                                            type="button"
                                            className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                                            aria-label={`More actions for ${event.title}`}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                </article>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </main>
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

function StatusBadge({ status }: { status: EventStatus }) {
    const styles: Record<EventStatus, string> = {
        draft: "bg-slate-100 text-slate-500",
        published: "bg-black text-white",
        ongoing: "bg-blue-100 text-blue-700",
        completed: "bg-emerald-100 text-emerald-700",
        cancelled: "bg-rose-100 text-rose-700",
        registration_open: "bg-rose-100 text-rose-700",
    };

    return (
        <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${styles[status]}`}>
            {status.replace("-", " ")}
        </span>
    );
}
