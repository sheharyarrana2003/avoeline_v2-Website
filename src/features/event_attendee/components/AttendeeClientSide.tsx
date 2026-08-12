"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState, useCallback, useMemo } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { AttendeeInput } from "./AttendeeInput";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Users, UserCheck, Clock, Ban } from "lucide-react";
import { Registration } from "@/src/services/models/reg.type";
import { useSearchParams } from "next/navigation";

export interface AttendeeClientSideProp {
    a: Attendee,
    user: User,
    register: Registration
}

export function AttendeeClientSide({ attendees = [], handle_reg_status }: { attendees: AttendeeClientSideProp[] | [], handle_reg_status: (reg: Registration) => Promise<void> }) {
    // The open row is held by id, not by object, so the drawer keeps showing the
    // current registration after a server revalidation replaces the props.
    const [open_registration_id, set_open_registration_id] = useState<string | null>(null);
    const searchParams = useSearchParams();

    // Stable identity so the memoized rows don't all re-render on every parent
    // state change. Identify a row by its registration, not its user: one user
    // can register for the same event several times, so matching on userId
    // always opened row one.
    const handleOnClick = useCallback((registration_id: string) => {
        set_open_registration_id(registration_id);
    }, []);

    const stats = useMemo(() => {
        const total = attendees.length;
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
    }, [attendees]);

    const query = searchParams.get("value");
    const attendee = useMemo<AttendeeClientSideProp[]>(() => {
        if (!query) return attendees;
        // Plain substring match: building a RegExp from raw user input throws
        // on regex metacharacters (e.g. "(", "[", "*") and crashed the list.
        const needle = query.toLowerCase();
        return attendees.filter((s) =>
            (s.user?.profile?.fullName ?? "").toLowerCase().includes(needle)
        );
    }, [attendees, query]);

    const open_attendee = attendees.find((a) => a.register.registrationId === open_registration_id) ?? null;

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            <div className="min-w-0 flex-1">
                {/* Section heading, not a page title: the event layout already renders
                    the event's name, status and tabs above this. */}
                <h2 className="mb-8 font-display text-xl text-ink">Attendees</h2>

                <section className="mb-8 grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                    <StatCard_dashboard title="Registered" value={`${stats.total}`} icon={<Users className="h-4 w-4" />} />
                    <StatCard_dashboard title={`Checked in (${stats.checkedInPercent}%)`} value={`${stats.checkedIn}`} icon={<UserCheck className="h-4 w-4" />} />
                    <StatCard_dashboard title="Pending" value={`${stats.pending}`} icon={<Clock className="h-4 w-4" />} />
                    <StatCard_dashboard title="Cancelled" value={`${stats.cancelled}`} icon={<Ban className="h-4 w-4" />} />
                </section>

                <div className="mb-6">
                    <AttendeeInput />
                </div>

                {attendee.length === 0 ? (
                    // Without this the page drew a search box, a header row, and then
                    // pure white space -- indistinguishable from a page that failed.
                    <EmptyState
                        icon={<Users className="h-5 w-5" />}
                        title={query ? "No attendees match that search" : "No one has registered yet"}
                        description={
                            query
                                ? "Try part of a name, or clear the search to see everyone."
                                : "Share the event's registration link. Everyone who signs up appears here with their ticket, payment and check-in state."
                        }
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr] border-b border-line px-4 py-3 text-2xs font-medium uppercase text-ink-soft">
                            <div>Attendee</div>
                            <div>Ticket</div>
                            <div>Status</div>
                            <div>Check-in</div>
                        </div>

                        <div className="mt-2">
                            {attendee.map((acs) => (
                                <AttendeeListItem
                                    key={acs.register.registrationId}
                                    attendee_user={acs.user}
                                    attendee_reg={acs.register}
                                    handleOnClick={handleOnClick}
                                    isOpen={acs.register.registrationId === open_registration_id}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {open_attendee && (
                <aside className="w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-paper lg:sticky lg:top-8 lg:h-fit lg:w-[400px]">
                    <SingleAttendeeView
                        combined_data={open_attendee}
                        onClose={() => set_open_registration_id(null)}
                        update_registration={handle_reg_status}
                    />
                </aside>
            )}
        </div>
    )
}
