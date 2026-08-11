import { EventsTab } from "@/src/shared_components/organizer/EventTab";

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


    const tabs = [
        { label: "Overview", value: "overview", href: `/organizer/${organizer_id}/events/${eventId}` },
        { label: "Attendees", value: "attendees", href: `/organizer/${organizer_id}/events/${eventId}/attendees` },
        { label: "Agenda", value: "agenda", href: `/organizer/${organizer_id}/events/${eventId}/agenda` },
        { label: "Speakers", value: "speakers", href: `/organizer/${organizer_id}/events/${eventId}/speakers` },
        { label: "Vendors", value: "vendors", href: `/organizer/${organizer_id}/events/${eventId}/vendors` },
        // { label: "Analytics", value: "analytics", href: `/organizer/${organizer_id}/events/${eventId}/analytics` },
        { label: "Certificates", value: "certificates", href: `/organizer/${organizer_id}/events/${eventId}/certificates` },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 lg:flex-row">
            {/* Section nav for one event. Deliberately quieter and narrower than the
                global rail it now sits beside: no shadow, a plain hairline, and it
                stacks above the content below lg rather than eating half the width. */}
            <aside className="shrink-0 border-b border-gray-200 bg-white lg:w-56 lg:border-r lg:border-b-0">
                <nav>
                    <EventsTab tabs={tabs} />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="min-w-0 flex-1 p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}