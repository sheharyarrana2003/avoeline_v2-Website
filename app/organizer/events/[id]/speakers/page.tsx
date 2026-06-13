import { SpeakerService } from "@/src/features/event_speakers/speakers.service"
import { AuthService } from "@/src/services/authService"
import Link from "next/link";
import { SpeakerSearchBar } from "@/src/features/event_speakers/components/SpeakerSearchBar";
import {
    SpeakerCard

} from "@/src/features/event_speakers/components/SpeakerCard";
export default async function speaker({ params }: { params: Promise<{ id: string }> }) {
    const u = await AuthService.getCurrentUser();
    const { id } = await params;

    const allSpeaker = await SpeakerService.getAllSpeakers(u.id, id);
    console.log(allSpeaker);

    const count_of_speakers = allSpeaker.length;

    return (
        <>
            <h1>SPEAKERS</h1>
            <p>{count_of_speakers} spekaers</p>
            <Link
                href={`/organizer/events/${id}/speakers/create-speaker`}
            >Add Speaker</Link>
            <SpeakerSearchBar />
            <div className="grid grid-cols-4 gap-4">
                {allSpeaker.map(speaker => (
                    <SpeakerCard key={speaker.speakerId} speaker={speaker} />
                ))}
            </div>
        </>
    )
}