import CreateAgendaForm from "@/src/features/agendas/components/CreateAgendaForm";
import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service";
import { Speaker } from "@/src/services/models/event.model";
import { EventService } from "@/src/services/event.service";
import { accessTypeOf } from "@/src/features/access/access.service";

export default async function CreateAgendaPage({
    params,
}: {
    params: Promise<{ eventId: string; organizer_id: string }>;
}) {
    const { eventId, organizer_id } = await params;
    const all_speakers : Speaker[] = await SpeakerService.getAllSpeakers(eventId);

    // Per-session tier restrictions are only offered on events whose access model
    // gives attendees a tier at all -- on anything else the control would gate
    // against a value nobody holds.
    const event = await EventService.getEventByID(eventId);
    const type = event ? accessTypeOf(event) : "public";
    const attendeeTiers = type === "tiered" || type === "hybrid" ? (event?.access?.attendeeTiers ?? []) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                <CreateAgendaForm eventId={eventId} activeSpeakers={all_speakers} organizerId={organizer_id} attendeeTiers={attendeeTiers} />
            </div>
        </div>
    );
}
