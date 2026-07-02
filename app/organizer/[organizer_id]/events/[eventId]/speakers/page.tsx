import { SpeakerService } from "@/src/features/event_speakers/speakers.service"
import { AuthService } from "@/src/features/auth/authService"
import Link from "next/link";
import { SpeakerSearchBar } from "@/src/features/event_speakers/components/SpeakerSearchBar";
import { SpeakerCard } from "@/src/features/event_speakers/components/SpeakerCard";

export default async function SpeakerPage(
    { params, searchParams }:
    {
        params: Promise<{ id: string; organizer_id: string }>,
        searchParams: Promise<{ input_val?: string }>
    }
) {
    const u = await AuthService.getCurrentUser();
    const { id, organizer_id } = await params;
    const resolvedParams = await searchParams;

    const allSpeakers = await SpeakerService.getAllSpeakers(u.id, id);
    let allSpeaker;

    if (resolvedParams.input_val) {
        const dynamicRegex = new RegExp(`${resolvedParams.input_val}`, "i")
        allSpeaker = allSpeakers.filter((s) => dynamicRegex.test(s.name))
    } else {
        allSpeaker = allSpeakers;
    }

    const count_of_speakers = allSpeaker.length;

    return (
        <div className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-screen font-sans">
            {/* Top Header Row */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 uppercase">
                        TECHVERSE HACKATHON 2026
                    </h1>
                    <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {count_of_speakers} Speakers
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-full shadow-sm hover:bg-gray-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Import Speakers
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <Link
                        href={`/organizer/${organizer_id}/events/${id}/speakers/create-speaker`}
                        className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-medium rounded-full shadow-sm hover:bg-gray-800 transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Add Speaker
                    </Link>
                </div>
            </div>

            {/* Controls Row (Search, Filter, Sort) */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex-1">
                    <SpeakerSearchBar />
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
                        Sort
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allSpeaker.map(speaker => (
                    <SpeakerCard key={speaker.speakerId} speaker={speaker} />
                ))}
            </div>
        </div>
    )
}