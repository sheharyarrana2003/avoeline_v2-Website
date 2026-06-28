import { EventService } from "@/src/services/event.service";
import { EventStatus } from "@/src/services/models/event.model";
import {
    CalendarDays,
    ChevronLeft,
    Eye,
    MapPin,
    MoreHorizontal,
    Star,
    Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string; organizer_id: string }> }) {
    const { id, organizer_id } = await params;
    const event = await EventService.getEventByID(id);

    if (!event) {
        notFound();
    }

    const checkedIn = Math.round(event.registered * 0.75);
    const capacityPercent = getPercent(event.registered, event.capacity);
    const targetRevenue = Math.max(event.revenue, event.capacity * Math.max(event.ticketPrice, 1));
    const revenuePercent = getPercent(event.revenue, targetRevenue);
    const recentRegistrations = [
        ["Zain Ahmed", "Fullstack Developer", "2m ago"],
        ["Sarah Khan", "UX Designer", "15m ago"],
        ["Omar Siddiqui", "AI Researcher", "1h ago"],
        ["Esha Malik", "Product Manager", "3h ago"],
        ["Hamza Raza", "Blockchain Dev", "5h ago"],
    ];

    return (
        <main className="px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <header className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link
                            href={`/organizer/${organizer_id}/events`}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950"
                            aria-label="Back to events"
                        >
                            <ChevronLeft size={22} />
                        </Link>
                        <h1 className="truncate text-2xl font-extrabold uppercase tracking-tight text-slate-950">
                            {event.title}
                        </h1>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <StatusPill status={event.status} />
                        <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                            aria-label="More event actions"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </header>

                <section className="relative min-h-60 overflow-hidden rounded-3xl bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.36),transparent_28%),linear-gradient(115deg,#111827,#64748b_52%,#111827)] opacity-80 grayscale" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),rgba(0,0,0,0.15),rgba(0,0,0,0.62))]" />
                    <div className="relative flex min-h-60 items-end p-6 sm:p-8">
                        <div className="flex flex-wrap gap-3 rounded-2xl bg-black/55 p-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur">
                            <span className="flex items-center gap-2">
                                <CalendarDays size={16} />
                                {event.date}
                            </span>
                            <span className="hidden h-5 w-px bg-white/25 sm:block" />
                            <span className="flex items-center gap-2">
                                <MapPin size={16} />
                                {event.location}
                            </span>
                            <span className="hidden h-5 w-px bg-white/25 sm:block" />
                            <span className="flex items-center gap-2">
                                <Users size={16} />
                                {event.registered} Registrations
                            </span>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Registrations"
                        value={`${event.registered}`}
                        suffix={`/${event.capacity}`}
                        helper={`${capacityPercent}% Capacity`}
                        progress={capacityPercent}
                    />
                    <MetricCard
                        label="Checked In"
                        value={`${checkedIn}`}
                        suffix={` (${getPercent(checkedIn, event.registered)}%)`}
                        helper="Live attendance"
                        bars
                    />
                    <MetricCard
                        label="Revenue"
                        value={`PKR ${event.revenue.toLocaleString("en-US")}`}
                        helper={`${revenuePercent}% of Target`}
                        progress={revenuePercent}
                    />
                    <MetricCard
                        label="Avg. Rating"
                        value="4.8"
                        helper="Based on 142 reviews"
                        rating
                    />
                </section>

                <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                    <div className="space-y-8">
                        <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <h2 className="text-xl font-extrabold uppercase text-slate-950">Event Description</h2>
                            <div className="mt-6 space-y-5 text-base font-semibold leading-7 text-slate-500">
                                <p>{event.description}</p>
                                <p>
                                    Participants will get access to curated sessions, hands-on collaboration, event resources,
                                    and real-time updates from the organizer throughout the program.
                                </p>
                            </div>
                        </article>
                        <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <h2 className="text-xl font-extrabold uppercase text-slate-950">System Details & Timings</h2>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">

                                {/* Status */}


                                {/* Category */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</p>
                                    <p className="text-sm font-semibold capitalize text-slate-900">{event.category}</p>
                                </div>

                                {/* Time */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Event Time</p>
                                    <p className="text-sm font-semibold text-slate-900">{event.time}</p>
                                </div>




                                {/* Timestamps */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 pt-4 border-t border-slate-100 mt-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Created At</p>
                                        <p className="text-sm font-medium text-slate-500">
                                            {new Date(event.createdAt).toLocaleString(undefined, {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Last Updated</p>
                                        <p className="text-sm font-medium text-slate-500">
                                            {new Date(event.updatedAt).toLocaleString(undefined, {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </article>

                        <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <h2 className="text-xl font-extrabold uppercase text-slate-950">Key Information</h2>
                            <div className="mt-7 grid gap-6 md:grid-cols-3">
                                <InfoBlock label="Organizer" value="Avoeline Creative Labs" />
                                <InfoBlock label="Contact" value="hello@avoeline.com" />
                                <InfoBlock label="Ticket Price" value={`PKR ${event.ticketPrice.toLocaleString("en-US")}`} />
                            </div>
                            {event.tags && event.tags.length > 0 && (
                                <div className="mt-7 flex flex-wrap gap-2">
                                    {event.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-600"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>

                    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold uppercase text-slate-950">Recent Registrations</h2>
                            <Link href="#" className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                                View All
                            </Link>
                        </div>
                        <ul className="space-y-4">
                            {recentRegistrations.map(([name, role, time], index) => (
                                <li key={name} className="flex items-center gap-4">
                                    <span className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-500">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-extrabold text-slate-950">{name}</p>
                                        <p className="truncate text-xs font-semibold text-slate-400">
                                            {role} - {time}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </section>
            </div>
        </main>
    );
}

function getPercent(value: number, total: number) {
    if (total <= 0) {
        return 0;
    }

    return Math.min(100, Math.round((value / total) * 100));
}

function StatusPill({ status }: { status: EventStatus }) {
    return (
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-black px-4 text-xs font-extrabold uppercase tracking-wider text-white">
            <Eye size={14} />
            {status.replace("-", " ")}
        </span>
    );
}

function MetricCard({
    label,
    value,
    suffix,
    helper,
    progress,
    bars,
    rating,
}: {
    label: string;
    value: string;
    suffix?: string;
    helper: string;
    progress?: number;
    bars?: boolean;
    rating?: boolean;
}) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-extrabold text-slate-400">{label}</p>
            <div className="mt-4 flex items-end gap-1">
                <p className="text-3xl font-extrabold leading-none text-slate-950">{value}</p>
                {suffix && <span className="text-xl font-bold text-slate-300">{suffix}</span>}
                {rating && (
                    <span className="mb-1 ml-1 flex text-slate-950">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} size={14} />
                        ))}
                    </span>
                )}
            </div>

            {bars ? (
                <div className="mt-6 flex h-7 items-end gap-2">
                    {[45, 62, 74, 100, 68].map((height, index) => (
                        <span
                            key={height}
                            className={`flex-1 rounded-t-sm ${index === 3 ? "bg-black" : "bg-slate-300"}`}
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
            ) : progress !== undefined ? (
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
                </div>
            ) : null}

            <p className="mt-4 text-sm font-extrabold text-slate-600">{helper}</p>
        </article>
    );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-2 font-extrabold text-slate-950">{value}</p>
        </div>
    );
}
