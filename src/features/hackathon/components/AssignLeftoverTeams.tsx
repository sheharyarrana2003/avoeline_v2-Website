"use client";

import { useMemo, useState } from "react";
import { assignLeftoverToTeam } from "../actions/assignLeftover.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";

export function AssignLeftoverTeams({
    eventId,
    returnTo,
    leftover,
    tracks,
    teams,
}: {
    eventId: string;
    returnTo: string;
    leftover: AttendeeClientSideProp[];
    tracks: { id: string; name: string; maxTeamSize: number }[];
    teams: { id: string; name: string; trackId: string; size: number; maxTeamSize: number }[];
}) {
    const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
    const trackTeams = useMemo(() => teams.filter((t) => t.trackId === trackId), [teams, trackId]);
    if (!leftover.length || !tracks.length) return null;

    return (
        <form action={assignLeftoverToTeam} className="mb-8 space-y-4 rounded-2xl border border-line bg-paper p-4">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <h3 className="font-display text-base text-ink">People with no team</h3>
            <p className="text-xs text-ink-soft">Assign leftover registrations to an existing team or create one.</p>
            <ul className="max-h-40 space-y-1 overflow-auto text-sm">
                {leftover.map((row) => (
                    <li key={row.register.registrationId}>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" name="registrationId" value={row.register.registrationId} />
                            <span>
                                {row.user?.profile?.fullName || row.register.attendee?.name || "Attendee"}
                                <span className="text-ink-soft"> · {row.register.attendee?.email || row.user?.email}</span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="assign-track" className={labelClass}>Competition</label>
                    <select id="assign-track" name="trackId" value={trackId} onChange={(e) => setTrackId(e.target.value)} className={fieldClass}>
                        {tracks.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} (max {t.maxTeamSize})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="assign-team" className={labelClass}>Existing team</label>
                    <select id="assign-team" name="teamId" defaultValue="" className={fieldClass}>
                        <option value="">Create new…</option>
                        {trackTeams.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({t.size}/{t.maxTeamSize})
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="assign-name" className={labelClass}>New team name</label>
                <input id="assign-name" name="newTeamName" maxLength={80} className={fieldClass} placeholder="Only used if you create a team" />
            </div>
            <SubmitButton className={buttonClass("primary", "sm")}>Assign to team</SubmitButton>
        </form>
    );
}
