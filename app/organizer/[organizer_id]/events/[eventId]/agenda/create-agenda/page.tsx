import CreateAgendaForm from "@/src/features/agendas/components/CreateAgendaForm";
import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service";
import { Speaker } from "@/src/services/models/event.model";

export default async function CreateAgendaPage({
    params,
}: {
    params: Promise<{ eventId: string; organizer_id: string }>;
}) {
    const { eventId, organizer_id } = await params;
    const all_speakers : Speaker[] = await SpeakerService.getAllSpeakers(eventId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                <CreateAgendaForm eventId={eventId} activeSpeakers={all_speakers} organizerId={organizer_id} />
            </div>
        </div>
    );
}
