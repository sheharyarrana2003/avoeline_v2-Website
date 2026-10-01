"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState, useCallback, useMemo } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { AttendeeInput } from "./AttendeeInput";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ExportButton } from "@/src/features/exports/components/ExportButton";
import type { ExportResult } from "@/src/features/exports/types";
import { Users, UserCheck, Clock, Ban } from "lucide-react";
import type { ReactNode } from "react";
import { Registration } from "@/src/services/models/reg.type";
import { useSearchParams } from "next/navigation";
import { GroupedAttendeeList, type GroupedAttendeeGroup } from "./GroupedAttendeeList";

export interface AttendeeTeamGroup {
    id: string;
    name: string;
    trackName: string;
    accessCode: string | null;
    memberIds: string[];
}

export interface AttendeeClientSideProp {
    a: Attendee,
    user: User,
    register: Registration
    /**
     * A freshly signed URL for `register.payment.proofPath`, or null when there is
     * no proof. Minted on the server per render because the proofs bucket is
     * private and signed links expire -- the document stores a storage key, never
     * a URL.
     */
    proofUrl?: string | null
}

export function AttendeeClientSide({
    attendees = [],
    handle_reg_status,
    onExport,
    requiresApproval = false,
    extra,
    occupyingCount,
    teams,
    groups,
    defaultGrouped = false,
}: {
    attendees: AttendeeClientSideProp[] | [],
    handle_reg_status: (reg: Registration) => Promise<void>,
    onExport?: () => Promise<ExportResult>,
    requiresApproval?: boolean,
    extra?: ReactNode,
    occupyingCount?: number,
    teams?: AttendeeTeamGroup[],
    groups?: GroupedAttendeeGroup[],
    defaultGrouped?: boolean,
}) {
    // The open row is held by id, not by object, so the drawer keeps showing the
    // current registration after a server revalidation replaces the props.
    const [open_registration_id, set_open_registration_id] = useState<string | null>(null);
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
    const [view, setView] = useState<"grouped" | "flat">(defaultGrouped ? "grouped" : "flat");
    const searchParams = useSearchParams();

    // Stable identity so the memoized rows don't all re-render on every parent
    // state change. Identify a row by its registration, not its user: one user
    // can register for the same event several times, so matching on userId
    // always opened row one.
    const handleOnClick = useCallback((registration_id: string) => {
        set_open_registration_id(registration_id);
    }, []);

    const stats = useMemo(() => {
        const total = occupyingCount ?? attendees.length;
        let checkedIn = 0;
        let cancelled = 0;
        let pending = 0;

        attendees.forEach((item) => {
            // Bucket every known status: those who showed up (checked_in /
            // attended), those who won't (cancelled / no_show), and everyone
            // still outstanding (pending / confirmed / awaiting_payment).
            const status = item.register?.status;
            if (!status) return;

            if (status === "checked_in" || status === "attended") {
                checkedIn++;
            } else if (status === "cancelled" || status === "no_show") {
                cancelled++;
            } else {
                pending++;
            }
        });

        const checkedInPercent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
        return { total, checkedIn, pending, cancelled, checkedInPercent };
    }, [attendees, occupyingCount]);

    const query = searchParams.get("value");
    const attendee = useMemo<AttendeeClientSideProp[]>(() => {
        if (!query) return attendees;
        // Plain substring match: building a RegExp from raw user input throws
        // on regex metacharacters (e.g. "(", "[", "*") and crashed the list.
        const needle = query.toLowerCase();
        return attendees.filter((s) => {
            const name = (s.user?.profile?.fullName ?? "").toLowerCase();
            const email = (s.user?.email ?? "").toLowerCase();
            const teamHit = (teams ?? []).some(
                (t) =>
                    t.memberIds.includes(s.register.registrationId) &&
                    (t.name.toLowerCase().includes(needle) || t.accessCode?.toLowerCase().includes(needle)),
            );
            return name.includes(needle) || email.includes(needle) || teamHit;
        });
    }, [attendees, query, teams]);

    const handleQuickStatusChange = useCallback(async (reg: Registration, newStatus: "confirmed" | "rejected") => {
        const updated: Registration = {
            ...reg,
            status: newStatus,
            statusHistory: [
                ...(reg.statusHistory || []),
                { status: newStatus, timestamp: new Date().toISOString() }
            ]
        };
        await handle_reg_status(updated);
    }, [handle_reg_status]);

    const open_attendee = attendees.find((a) => a.register.registrationId === open_registration_id) ?? null;

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            <div className="min-w-0 flex-1">
                {/* Section heading, not a page title: the event layout already renders
                    the event's name, status and tabs above this. */}
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <h2 className="font-display text-xl text-ink">{(teams?.length || groups?.length) && view === "grouped" ? "Groups" : "Attendees"}</h2>
                    <div className="flex items-center gap-3">
                        {(teams?.length || groups?.length || defaultGrouped) ? (
                            <div className="flex rounded-full border border-line text-xs">
                                <button
                                    type="button"
                                    onClick={() => setView("grouped")}
                                    className={`rounded-full px-3 py-1.5 ${view === "grouped" ? "bg-ink text-ink-invert" : "text-ink-soft"}`}
                                >
                                    Grouped
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView("flat")}
                                    className={`rounded-full px-3 py-1.5 ${view === "flat" ? "bg-ink text-ink-invert" : "text-ink-soft"}`}
                                >
                                    Flat
                                </button>
                            </div>
                        ) : null}
                    {onExport ? <ExportButton run={onExport} label="Export attendees" /> : null}
                    </div>
                </div>

                <section className="mb-8 grid grid-cols-2 rounded-xl border border-line bg-paper shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-line">
                    <MetricTile
                        label={occupyingCount != null ? "Team registrations" : "Registered"}
                        value={`${stats.total}`}
                        icon={<Users className="h-4 w-4" />}
                        sublabel={occupyingCount != null ? `${attendees.length} people on the list` : "Excluding cancellations"}
                    />
                    <MetricTile
                        label="Checked in"
                        value={`${stats.checkedIn}`}
                        icon={<UserCheck className="h-4 w-4" />}
                        sublabel={`${stats.checkedInPercent}% of registered`}
                    />
                    <MetricTile
                        label="Pending"
                        value={`${stats.pending}`}
                        icon={<Clock className="h-4 w-4" />}
                        sublabel="Registered, not yet arrived"
                    />
                    <MetricTile
                        label="Cancelled"
                        value={`${stats.cancelled}`}
                        icon={<Ban className="h-4 w-4" />}
                        sublabel="Withdrawn registrations"
                    />
                </section>

                <div className="mb-6">
                    <AttendeeInput />
                </div>

                {extra}

                {attendee.length === 0 ? (
                    <div className="rounded-xl border border-line bg-paper p-6 shadow-xs">
                        <EmptyState
                            icon={<Users className="h-6 w-6 text-primary" />}
                            title={query ? "No attendees match that search" : "No one has registered yet"}
                            description={
                                query
                                    ? "Try part of a name, or clear the search to see everyone."
                                    : "Share the event's registration link. Everyone who signs up appears here with their ticket, payment and check-in state."
                            }
                        />
                    </div>
                ) : view === "grouped" && (teams?.length || groups?.length) ? (
                    <GroupedAttendeeList
                        groups={
                            groups?.length
                                ? groups.map((g) => ({
                                      ...g,
                                      members: g.members.filter((m) => attendee.some((a) => a.register.registrationId === m.register.registrationId)),
                                  }))
                                : (teams ?? []).map((team) => ({
                                      id: team.id,
                                      name: team.name,
                                      subtitle: team.trackName,
                                      accessCode: team.accessCode,
                                      members: attendee.filter((a) => team.memberIds.includes(a.register.registrationId)),
                                  }))
                        }
                        leftover={
                            groups?.length
                                ? attendee.filter((a) => !(groups ?? []).some((g) => g.members.some((m) => m.register.registrationId === a.register.registrationId)))
                                : attendee.filter((a) => !(teams ?? []).some((t) => t.memberIds.includes(a.register.registrationId)))
                        }
                        expandedId={expandedTeamId}
                        onToggle={(id) => setExpandedTeamId((cur) => (cur === id ? null : id))}
                        handleOnClick={handleOnClick}
                        openRegistrationId={open_registration_id}
                        onQuickStatusChange={handleQuickStatusChange}
                    />
                ) : (
                    <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-xs">
                        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr] border-b border-line bg-muted/30 px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
                            <div>Attendee</div>
                            <div>Ticket</div>
                            <div>Status</div>
                            <div>Check-in / Action</div>
                        </div>

                        <div className="divide-y divide-line">
                            {attendee.map((acs) => (
                                <AttendeeListItem
                                    key={acs.register.registrationId}
                                    attendee_user={acs.user}
                                    attendee_reg={acs.register}
                                    handleOnClick={handleOnClick}
                                    isOpen={acs.register.registrationId === open_registration_id}
                                    onQuickStatusChange={handleQuickStatusChange}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {open_attendee && (
                <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-line bg-paper shadow-xs lg:sticky lg:top-8 lg:h-fit lg:w-[400px]">
                    <SingleAttendeeView
                        requiresApproval={requiresApproval}
                        combined_data={open_attendee}
                        onClose={() => set_open_registration_id(null)}
                        update_registration={handle_reg_status}
                    />
                </aside>
            )}
        </div>
    )
}
