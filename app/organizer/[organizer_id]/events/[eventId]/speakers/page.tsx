import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service"
import Link from "next/link";
import { SpeakerSearchBar } from "@/src/features/event_speakers/components/SpeakerSearchBar";
import { SpeakerCard } from "@/src/features/event_speakers/components/SpeakerCard";
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
    const { eventId, organizer_id } = await params;
    const resolvedParams = await searchParams;

    const allSpeakers = await SpeakerService.getAllSpeakers(eventId);
    let allSpeaker;

    if (resolvedParams.input_val) {
        const dynamicRegex = new RegExp(`${resolvedParams.input_val}`, "i")
        allSpeaker = allSpeakers.filter((s) => dynamicRegex.test(s.name))
    } else {
        allSpeaker = allSpeakers;
    }

    const count_of_speakers = allSpeaker.length;

    return (
        // The event layout already supplies the page padding.
        <div className="mx-auto max-w-7xl">
            {/* Section header, not a page header: the event layout already renders the
                event's name, status and breadcrumb above this. */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <h2 className="flex items-center gap-3 font-display text-xl text-ink">
                    Speakers
                    <span className="text-sm text-ink-soft tabular-nums">{count_of_speakers}</span>
                </h2>

                <Link
                    href={`/organizer/${organizer_id}/events/${eventId}/speakers/create-speaker`}
                    className={buttonClass("primary")}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add speaker
                </Link>
            </div>

            <div className="mb-8">
                <SpeakerSearchBar />
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
            )}
        </div>
    )
}
