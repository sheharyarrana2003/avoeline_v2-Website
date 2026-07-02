import { EventsTab } from "@/src/shared_components/organizer/EventTab";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { revalidatePath } from "next/cache";
import { notFound } from 'next/navigation';

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
        { label: "Analytics", value: "analytics", href: `/organizer/${organizer_id}/events/${eventId}/analytics` },
        { label: "Certificates", value: "certificates", href: `/organizer/${organizer_id}/events/${eventId}/certificates` },
    ];

    return (
        <div className="flex min-h-screen bg-[#f5f6f8]">
            {/* Vertical Sidebar */}
            <aside className="w-[260px] flex flex-col bg-white border-r border-gray-200 shadow-[4px_0_12px_rgba(0,0,0,0.03)] z-10">

                {/* 1. Techverse Brand Header */}
               

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