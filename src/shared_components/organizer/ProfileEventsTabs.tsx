"use client";

import Link from "next/link";
import { useState } from "react";

export interface ProfileEventSummary {
    id: string;
    title: string;
    date: string;
    venueName: string;
    category: string;
    isPast: boolean;
}

const TABS = ["Upcoming Events", "Past Events", "About"] as const;
type ProfileTab = (typeof TABS)[number];

export function ProfileEventsTabs({
    events,
    about,
    basePath,
}: {
    events: ProfileEventSummary[];
    about: string;
    basePath: string;
}) {
    const [activeTab, setActiveTab] = useState<ProfileTab>("Upcoming Events");

    const upcoming = events.filter((e) => !e.isPast);
    const past = events.filter((e) => e.isPast);
    const list = activeTab === "Upcoming Events" ? upcoming : past;

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex border-b border-gray-100">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-3 pb-2 text-sm font-medium transition-colors ${activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-black" />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === "About" ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                    {about?.trim() ? about : "No description provided."}
                </p>
            ) : list.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                    No {activeTab === "Upcoming Events" ? "upcoming" : "past"} events found.
                </p>
            ) : (
                <ul className="space-y-4">
                    {list.map((event) => (
                        <li key={event.id} className="group">
                            <Link href={`${basePath}/events/${event.id}`} className="block">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-gray-900">
                                        {event.title}
                                    </h3>
                                    <span className="shrink-0 text-xs font-semibold text-gray-400">
                                        {event.date || "—"}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    {[event.category, event.venueName].filter(Boolean).join(" • ")}
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
