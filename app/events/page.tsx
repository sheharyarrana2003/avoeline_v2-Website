import Link from "next/link";
import { CalendarSearch, MapPin } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { normalizeQuery } from "@/src/lib/search";
import { getBrowsableEvents } from "@/src/features/events/browse.service";
import { ticketFor } from "@/src/features/registration/registration.service";

export const metadata = {
    title: "Browse events — Avoeline",
    description: "Find an event to attend.",
};

/**
 * Browse Events -- the public listing spec 2.1 requires.
 *
 * Unauthenticated: `proxy.ts` matches only the role prefixes, so this tree needs
 * nothing opened up. Only public, hybrid and tiered events appear; private and
 * invite-only are absent by construction, since `isListedPublicly` is the same
 * predicate the access rule uses rather than a second opinion about it.
 *
 * The wizard has been telling organizers their event would be "listed on our
 * discovery platform" since before one existed. It does now.
 */
export default async function BrowseEventsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const query = normalizeQuery((await searchParams)?.q);
    const events = await getBrowsableEvents(query);

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
            <header className="mb-8">
                <Link href="/" className="mb-6 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                    <BrandMark className="h-7 w-7" />
                    <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
                </Link>
                <h1 className="font-display text-3xl text-ink">Browse events</h1>
                <p className="mt-1 text-sm text-ink-soft">
                    {query
                        ? `${events.length} event${events.length === 1 ? "" : "s"} matching “${query}”`
                        : "Events open for registration right now."}
                </p>
            </header>

            <div className="mb-8 max-w-md">
                <SearchField action="/events" placeholder="Search events, city, category" defaultValue={query} label="Search events" />
            </div>

            {events.length === 0 ? (
                <EmptyState
                    icon={<CalendarSearch size={28} />}
                    title={query ? `Nothing matches “${query}”` : "No events are open just now"}
                    description={
                        query
                            ? "Try a shorter search, or clear it to see everything that is open."
                            : "Check back soon — new events are published regularly."
                    }
                    action={query ? <Link href="/events" className={buttonClass("secondary")}>Clear search</Link> : undefined}
                />
            ) : (
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {events.map((event) => {
                        const { price } = ticketFor(event);
                        const venue = [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
                        return (
                            <li key={event.id}>
                                <Link href={`/events/${event.id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2">
                                    <Card tone="raised" interactive className="h-full">
                                        <CardBody>
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                {event.category ? <StatusBadge status="info" label={event.category} size="sm" /> : null}
                                                {event.eventType ? (
                                                    <span className="text-2xs font-medium uppercase text-ink-soft">{event.eventType}</span>
                                                ) : null}
                                            </div>
                                            <h2 className="font-display text-lg text-ink">{event.title}</h2>
                                            {event.shortDescription ? (
                                                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{event.shortDescription}</p>
                                            ) : null}
                                            <dl className="mt-4 space-y-1.5 text-sm text-ink-soft">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xs uppercase text-ink-faint">When</span>
                                                    <span className="text-ink">
                                                        {formatDateMedium(event.schedule?.startDate)}
                                                        {event.schedule?.startTime ? `, ${formatTime(event.schedule.startTime)}` : ""}
                                                    </span>
                                                </div>
                                                {venue ? (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={13} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                                        <span className="truncate">{venue}</span>
                                                    </div>
                                                ) : null}
                                            </dl>
                                            <p className="mt-4 font-display text-base text-ink">
                                                {formatCurrency(price, event.pricing?.currency || "PKR", "Free")}
                                            </p>
                                        </CardBody>
                                    </Card>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}
