import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service"
import CreateSpeakerForm from "@/src/features/event_speakers/components/CreateSpeakerForm"
import { listAgendaItemOptions } from "@/src/features/agendas/agendaSpeakers.service"
import { redirect } from "next/navigation"

export default async function Create_speaker({ params }: { params: Promise<{ organizer_id: string; eventId: string }> }) {
    const { organizer_id, eventId } = await params;

    const handle_speaker_submission = async (formData: FormData) => {
        "use server";
        await SpeakerService.createNewSpeaker(formData, eventId);
        redirect(`/organizer/${organizer_id}/events/${eventId}/speakers`);
    };

    const sessions = await listAgendaItemOptions(eventId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                <CreateSpeakerForm handle_speaker_submission={handle_speaker_submission} sessions={sessions} />
            </div>
        </div>
    )
}
