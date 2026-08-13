"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarOff } from "lucide-react";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

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
        // Uncarded: this sits on the profile canvas, and a grey panel there separated
        // from nothing. The tab rule below does the grouping the border used to.
        <section>
            <div className="mb-4 flex border-b border-line">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        aria-current={activeTab === tab ? "true" : undefined}
                        className={`-mb-px border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? "border-ink text-ink"
                                : "border-transparent text-ink-soft hover:text-ink"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "About" ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                    {about?.trim() ? about : "No description provided."}
                </p>
            ) : list.length === 0 ? (
                <EmptyState
                    size="sm"
                    icon={<CalendarOff className="h-5 w-5" />}
                    title={`No ${activeTab === "Upcoming Events" ? "upcoming" : "past"} events`}
                    description={
                        activeTab === "Upcoming Events"
                            ? "Published events with a future start date will be listed here."
                            : "Events that have already finished will be listed here."
                    }
                />
            ) : (
                <ul className="space-y-2">
                    {list.map((event) => (
                        <li key={event.id}>
                            {/* A real card here: the whole row is one click target. */}
                            <Link
                                href={`${basePath}/events/${event.id}`}
                                className="block rounded-2xl border border-line bg-paper p-5 transition hover:border-line-loud"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="truncate text-sm font-semibold text-ink">
                                        {event.title}
                                    </h3>
                                    <span className="shrink-0 text-xs font-medium text-ink-soft tabular-nums">
                                        {event.date || "—"}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-ink-soft">
                                    {[event.category, event.venueName].filter(Boolean).join(" • ")}
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
