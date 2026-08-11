import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service"
import { AuthService } from "@/src/features/auth/authService"
import Link from "next/link";
import { SpeakerSearchBar } from "@/src/features/event_speakers/components/SpeakerSearchBar";
import { SpeakerCard } from "@/src/features/event_speakers/components/SpeakerCard";
import { EventService } from "@/src/services/event.service";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { UserRoundCog, Plus } from "lucide-react";

export default async function SpeakerPage(
    { params, searchParams }:
    {
        params: Promise<{ eventId: string; organizer_id: string }>,
        searchParams: Promise<{ input_val?: string }>
    }
) {
    const u = await AuthService.getCurrentUser();
    const { eventId, organizer_id } = await params;
    const resolvedParams = await searchParams;

    const [allSpeakers, event] = await Promise.all([
        SpeakerService.getAllSpeakers(eventId),
        EventService.getEventByID(eventId),
    ]);
    let allSpeaker;

    if (resolvedParams.input_val) {
        const dynamicRegex = new RegExp(`${resolvedParams.input_val}`, "i")
        allSpeaker = allSpeakers.filter((s) => dynamicRegex.test(s.name))
    } else {
        allSpeaker = allSpeakers;
    }

    const count_of_speakers = allSpeaker.length;

    return (
        // The layout already supplies the page background and padding.
        <div className="mx-auto max-w-7xl font-sans">
            {/* Top Header Row */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 uppercase">
                        {event?.title ?? "Event Speakers"}
                    </h1>
                    <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {count_of_speakers} Speakers
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/organizer/${organizer_id}/events/${eventId}/speakers/create-speaker`}
                        className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-medium rounded-full shadow-sm hover:bg-gray-800 transition"
                    >
                        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Add Speaker
                    </Link>
                </div>
            </div>

            {/* Controls Row (Search, Filter, Sort) */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex-1">
                    <SpeakerSearchBar />
                </div>
 
            </div>

            {/* Grid Container. Without the empty branch this rendered a blank page:
                a heading, a search box, and then nothing at all. */}
            {count_of_speakers > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {allSpeaker.map(speaker => (
                        <SpeakerCard key={speaker.speakerId} speaker={speaker} />
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-gray-200 bg-white">
                    <EmptyState
                        icon={<UserRoundCog className="h-5 w-5" />}
                        title={resolvedParams.input_val ? "No speakers match that search" : "No speakers yet"}
                        description={
                            resolvedParams.input_val
                                ? "Try a different name, company or session."
                                : "Add the people presenting at this event so attendees can see who is speaking."
                        }
                        action={
                            resolvedParams.input_val ? undefined : (
                                <Link
                                    href={`/organizer/${organizer_id}/events/${eventId}/speakers/create-speaker`}
                                    className={buttonClass("primary")}
                                >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Add speaker
                                </Link>
                            )
                        }
                    />
                </div>
            )}
        </div>
    )
}