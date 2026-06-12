// app/(organzier)/dashboard/events/page.tsx
import { AnalyticsService } from "@/src/services/anaylService"
import { AuthService } from "@/src/services/authService";
import { EventService } from "@/src/services/event.service";
import { EventsTab } from "@/src/features/events/components/EventsTab"

export default async function MyEventsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    // const events = await EventController.getAllEvents();
    const resolvedParams = await searchParams;


    const u = await AuthService.getCurrentUser();
    const total_event = await AnalyticsService.getAnalyticsTotalEvents(u.id);
    const currentTab = resolvedParams.status || "all";

    const events = await EventService.getEventsByStatus(u.id, currentTab);
    { console.log("eventsss -> ",events) }
    return (
        <>
            <div style={{ background: '#c6f7ff', color: '#00394a', padding: '12px', border: '2px solid #00394a', fontSize: '18px', fontWeight: '700', textAlign: 'center' }}>SCREEN: Events — URL: /organizer/events</div>
            <h1>My Events</h1>
            <p>{total_event.value} events</p>
            <EventsTab currentTab={currentTab}></EventsTab>
            <ul>
                {events.map( e=> 
                    <li key={e.id}>
                        {e.title}
                        {e.category}
                        {e.location}
                        {e.date}
                        {e.capacity}

                        {e.status}
                        <a href={`/organizer/events/${e.id}`}>edit</a>
                    </li>

                )}

            </ul>

        </>
    );
}
