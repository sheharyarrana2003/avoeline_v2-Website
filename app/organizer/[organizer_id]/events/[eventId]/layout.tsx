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
        <div className="flex min-h-full flex-col bg-gray-50">
            {/* EventsTab renders its own <nav>; wrapping it in an <aside> here was
                what produced two stacked sidebars. */}
            <EventsTab tabs={tabs} />

            <main className="min-w-0 flex-1 p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}