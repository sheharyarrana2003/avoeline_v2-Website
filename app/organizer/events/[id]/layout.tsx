import { EventsTab } from "@/src/shared_components/organizer/EventTab";

export default async function EventLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const waitedParams = await params;
    const eventId = waitedParams.id;

    const tabs = [
        { label: "Dashboard", value: "overview", href: `/organizer/events/${eventId}` },
        { label: "Speakers", value: "speakers", href: `/organizer/events/${eventId}?tab=speakers` },
        { label: "Schedule", value: "schedule", href: `/organizer/events/${eventId}?tab=schedule` },
        { label: "Venues", value: "venues", href: `/organizer/events/${eventId}?tab=venues` },
        { label: "Settings", value: "settings", href: `/organizer/events/${eventId}?tab=settings` },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8] md:flex-row">
            <EventsTab tabs={tabs} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
