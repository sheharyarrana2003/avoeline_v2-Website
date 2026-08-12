import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EventsTab } from "@/src/shared_components/organizer/EventTab";
import { EventService } from "@/src/services/event.service";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";

export default async function EventLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ eventId: string; organizer_id: string }>;
}) {
    const waitedParams = await params;
    const eventId = waitedParams.eventId;
    const organizer_id = waitedParams.organizer_id;

    // cache()'d, so the sub-page reading the same event does not pay for it twice.
    const event = await EventService.getEventByID(eventId);

    const tabs = [
        { label: "Overview", value: "overview", href: `/organizer/${organizer_id}/events/${eventId}` },
        { label: "Attendees", value: "attendees", href: `/organizer/${organizer_id}/events/${eventId}/attendees` },
        { label: "Agenda", value: "agenda", href: `/organizer/${organizer_id}/events/${eventId}/agenda` },
        { label: "Speakers", value: "speakers", href: `/organizer/${organizer_id}/events/${eventId}/speakers` },
        { label: "Vendors", value: "vendors", href: `/organizer/${organizer_id}/events/${eventId}/vendors` },
        // { label: "Analytics", value: "analytics", href: `/organizer/${organizer_id}/events/${eventId}/analytics` },
        { label: "Certificates", value: "certificates", href: `/organizer/${organizer_id}/events/${eventId}/certificates` },
    ];

    // The event's identity lives here rather than in each of the six sections: they all
    // describe the same event, and when the tabs sat ABOVE the title they read as global
    // chrome — a peer of the sidebar rather than something scoped to this event. Order is
    // now where-you-are, what-you-are-looking-at, which-part-of-it.
    return (
        <div className="flex min-h-full flex-col bg-gray-50">
            <header className="border-b border-line bg-paper px-4 pt-5 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-3">
                    <ol className="flex items-center gap-1 text-xs text-ink-soft">
                        <li>
                            <Link
                                href={`/organizer/${organizer_id}/events`}
                                className="rounded-xs hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                Events
                            </Link>
                        </li>
                        <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
                        <li className="truncate text-ink">{event?.title ?? "Event"}</li>
                    </ol>
                </nav>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="font-display text-3xl text-ink">{event?.title ?? "Event"}</h1>
                    {event?.status ? <StatusBadge status={event.status} size="sm" /> : null}
                </div>

                <EventsTab tabs={tabs} />
            </header>

            <div className="min-w-0 flex-1 p-6 lg:p-8">
                {children}
            </div>
        </div>
    );
}
