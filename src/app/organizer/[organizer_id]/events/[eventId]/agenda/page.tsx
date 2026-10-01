import { AgendaService } from "@/src/features/agendas/agenda.service";
import AgendaClientContent from "@/src/features/agendas/components/AgendaClientContent";

export default async function AgendaPage({
    params,
}: {
    params: Promise<{ eventId: string; organizer_id: string }>;
}) {
    const { eventId, organizer_id } = await params;

    // Server-side data fetching from Firestore via the event's agenda array
    const [days, sessionsByDay] = await Promise.all([
        AgendaService.getAgendaDays(eventId),
        AgendaService.getSessionsGroupedByDate(eventId),
    ]);

    return (
        <AgendaClientContent
            id={eventId}
            organizer_id={organizer_id}
            days={days}
            sessionsByDay={sessionsByDay}
        />
    );
}
