import { SpeakerService } from "@/src/features/event_speakers/speakers.service"
import { AuthService } from "@/src/services/authService"
import Link from "next/link";
import { SpeakerSearchBar } from "@/src/features/event_speakers/components/SpeakerSearchBar";
import {
    SpeakerCard

} from "@/src/features/event_speakers/components/SpeakerCard";
export default async function speaker(
    { params, searchParams }:
        {
            params: Promise<{ id: string }>,
            searchParams: Promise<{ input_val?: string }>
        }
) {
    const u = await AuthService.getCurrentUser();
    const { id } = await params;
    const resolvedParams = await searchParams;
    console.log("these are query param in speaker ", resolvedParams.input_val)

    const allSpeakers = await SpeakerService.getAllSpeakers(u.id, id);
    let allSpeaker;

    if (resolvedParams.input_val) {
        const dynamicRegex = new RegExp(`${resolvedParams.input_val}`, "i")
        allSpeaker = allSpeakers.filter(
            (s) => {
                console.log("RESULT ", dynamicRegex.test(s.name))
                return dynamicRegex.test(s.name)

            }
        )
    } else {
        allSpeaker = allSpeakers;

    }


    const count_of_speakers = allSpeaker.length;

    return (
        <>
            <h1>SPEAKERS</h1>
            <p>{count_of_speakers} spekaers</p>
            <br />
            <Link
                href={`/organizer/events/${id}/speakers/create-speaker`}
            >Add Speaker</Link>
            <br />
            <SpeakerSearchBar />

            <div className="grid grid-cols-4 gap-4">
                {allSpeaker.map(speaker => (
                    <SpeakerCard key={speaker.speakerId} speaker={speaker} />
                ))}
            </div>
        </>
    )
}