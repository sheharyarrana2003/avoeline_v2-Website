"use client";

import AgendaHeader from "@/src/features/agendas/components/AgendaHeader";
import AgendaTimeline from "@/src/features/agendas/components/AgendaTimeline";
import { AgendaDay, Session } from "@/src/services/models/agenda.model";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface AgendaClientContentProps {
    id: string;
    organizer_id: string;
    days: AgendaDay[];
    sessionsByDay: Record<string, Session[]>;
}

function AgendaContent({ id, organizer_id, days, sessionsByDay }: AgendaClientContentProps) {
    const searchParams = useSearchParams();

    // Determine active date from URL or default to first day
    const activeDate = searchParams.get("day") || days[0]?.date || "";
    const activeSessions = sessionsByDay[activeDate] || [];

    return (
        <>
            <AgendaHeader
                id={id}
                organizer_id={organizer_id}
                days={days}
                sessionsByDay={sessionsByDay}
                activeDate={activeDate}
            />
            <AgendaTimeline sessions={activeSessions} />
        </>
    );
}

export default function AgendaClientContent(props: AgendaClientContentProps) {
    return (
        <Suspense fallback={<div className="p-8 text-gray-500">Loading agenda...</div>}>
            <AgendaContent {...props} />
        </Suspense>
    );
}
