import { AgendaService } from "@/src/features/agendas/agenda.service"
import AgendaClientContent from "@/src/features/agendas/components/AgendaClientContent"

export default async function AgendaPage({ params }:
    { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Server-side data fetching via the service layer
    const days = await AgendaService.getAgendaDays(id)
    const sessionsByDay = await AgendaService.getSessionsGroupedByDate(id)

    return (
        <AgendaClientContent
            id={id}
            days={days}
            sessionsByDay={sessionsByDay}
        />
    )
}
