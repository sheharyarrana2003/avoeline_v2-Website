import { notFound } from "next/navigation";
import { AgendaService } from "@/src/features/agendas/agenda.service";
import AgendaClientContent from "@/src/features/agendas/components/AgendaClientContent";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service";
import { eventIsHackathon, listTracks } from "@/src/features/hackathon/hackathon.service";

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ eventId: string; organizer_id: string }>;
}) {
  const { eventId, organizer_id } = await params;
  const event = await assertOwnedEvent(eventId);
  if (!event) notFound();

  const hackathon = await eventIsHackathon(event);
  const [days, sessionsByDay, speakers, tracks] = await Promise.all([
    AgendaService.getAgendaDays(eventId),
    AgendaService.getSessionsGroupedByDate(eventId),
    SpeakerService.getAllSpeakers(eventId),
    hackathon ? listTracks(eventId) : Promise.resolve([]),
  ]);

  return (
    <AgendaClientContent
      id={eventId}
      organizer_id={organizer_id}
      days={days}
      sessionsByDay={sessionsByDay}
      speakers={speakers.map((s) => ({ speakerId: s.speakerId, name: s.name }))}
      tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
      attendeeTiers={event.access?.attendeeTiers ?? []}
    />
  );
}
