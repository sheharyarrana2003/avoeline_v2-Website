import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service"
import CreateSpeakerForm from "@/src/features/event_speakers/components/CreateSpeakerForm"
import { redirect } from "next/navigation"

export default async function Create_speaker({ params }: { params: Promise<{ organizer_id: string; eventId: string }> }) {
    const { organizer_id, eventId } = await params;

    const handle_speaker_submission = async (formData: FormData) => {
        "use server";
        await SpeakerService.createNewSpeaker(formData, eventId);
        redirect(`/organizer/${organizer_id}/events/${eventId}/speakers`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                <CreateSpeakerForm handle_speaker_submission={handle_speaker_submission} />
            </div>
        </div>
    )
}
