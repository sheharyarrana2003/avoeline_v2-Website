import { EventsTab } from "@/src/shared_components/organizer/EventTab";
import { EventService } from "@/src/services/event.service";

export default async function EventLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const waitedParams = await params;
    const eventId = waitedParams.id;

    const event = await EventService.getEventByID(eventId);

    const tabs = [
        { label: "Overview", value: "overview", href: `/organizer/events/${eventId}` },
        { label: "Attendees", value: "attendees", href: `/organizer/events/${eventId}/attendees` },
        { label: "Agenda", value: "agenda", href: `/organizer/events/${eventId}/agenda` },
        { label: "Speakers", value: "speakers", href: `/organizer/events/${eventId}/speakers` },
        { label: "Vendors", value: "vendors", href: `/organizer/events/${eventId}/vendors` },
        { label: "Analytics", value: "analytics", href: `/organizer/events/${eventId}/analytics` },
        { label: "Certificates", value: "certificates", href: `/organizer/events/${eventId}/certificates` },
    ];

    return (
        <div className="flex min-h-screen bg-[#f5f6f8]">
            {/* Vertical Sidebar */}
            <aside className="w-[260px] flex flex-col bg-white border-r border-gray-200 shadow-[4px_0_12px_rgba(0,0,0,0.03)] z-10">
                
                {/* 1. Techverse Brand Header */}
                <div className="px-6 py-6 flex items-center gap-3">
                    <div className="bg-black text-white p-1.5 rounded-xl flex-shrink-0">
                        {/* ID Card / Ticket Icon */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="14" x="3" y="5" rx="2" ry="2"/>
                            <path d="M7 15h4M7 9h10M7 12h10"/>
                        </svg>
                    </div>
                    <span className="text-lg font-black text-[#1e293b] tracking-wide">{event.title}</span>
                </div>

                {/* 3. Vertical Tabs */}
                <nav className=" flex-1">
                    <EventsTab tabs={tabs} />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-8">
                {children}
            </main>
        </div>
    );
}