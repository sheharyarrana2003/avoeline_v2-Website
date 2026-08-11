"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState, useCallback, useMemo } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { AttendeeInput } from "./AttendeeInput";
import { AttendeeCard } from "./AttendeeCard";
import { Mail, MessageSquare, Download, CheckCircle, Trash2, Calendar, Ticket } from "lucide-react";
import { Registration } from "@/src/services/models/reg.type";
import { useSearchParams } from "next/navigation";

export interface AttendeeClientSideProp {
    a: Attendee,
    user: User,
    register: Registration
}

export function AttendeeClientSide({ attendees = [], eventTitle = "Event Attendees",handle_reg_status }: { attendees: AttendeeClientSideProp[]|[], eventTitle?: string ,handle_reg_status : (reg:Registration)=>Promise<void>}) {
    const [selected_ids, set_selected_ids] = useState<String[]>([]);
    const [single_attendee_view, set_single_attendee_view] = useState<AttendeeClientSideProp | null>(null);
    const searchParams = useSearchParams();

    // Stable identities so the memoized AttendeeListItem rows don't re-render
    // on every parent state change (search keystroke, selection toggle).
    // Identify a row by its registration, not its user: one user can register for
    // the same event several times, so matching on userId always opened row one.
    const handleOnClick = useCallback((registration_id: string) => {
        const target = attendees.find((a) => a.register.registrationId === registration_id) || null;
        if (target) {
            set_single_attendee_view(target);
        }
    }, [attendees]);

    const handleCheckBoxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, registration_id: string) => {
        const isChecked = e.target.checked;
        set_selected_ids((prev_arr) =>
            isChecked
                ? [...prev_arr, registration_id]
                : prev_arr.filter(item => item !== registration_id)
        );
    }, []);

    const stats = useMemo(() => {
        const total = attendees.length;
        let checkedIn = 0;
        let cancelled = 0;
        let pending = 0;

        attendees.forEach((item) => {
            const reg_of_this_user: Registration | null = item.register;
            if (!reg_of_this_user) {
                return;
            }
            const status = reg_of_this_user.status;

            // Bucket every known status: those who showed up (checked_in /
            // attended), those who won't (cancelled / no_show), and everyone
            // still outstanding (pending / confirmed / awaiting_payment).
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

    return (
        <div className="flex h-screen w-full relative overflow-hidden bg-gray-50">
            
            {/* Main Left Content */}
            <div className="flex-1 overflow-y-auto p-8 pb-32">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">{eventTitle}</h1>
                        <span className="bg-gray-200 h-6 w-12 rounded-full"></span>
                    </div>

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <AttendeeCard title={"TOTAL\nREGISTERED"} value={stats.total || "0"} />
                        <AttendeeCard title="CHECKED IN" value={stats.checkedIn || "0"} subValue={`${stats.checkedInPercent || "0"}%`} />
                        <AttendeeCard title="PENDING" value={stats.pending || "0"} />
                        <AttendeeCard title="CANCELLED" value={stats.cancelled || "0"} />
                    </div>

                    {/* Filters & Search */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1">
                            <AttendeeInput />
                        </div>
               
                    </div>

                    {/* List Headers */}
                    <div className="grid grid-cols-[40px_2.5fr_1fr_1fr_1fr_40px] px-6 py-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest border-b border-gray-200/50">
                        <div className="flex justify-center"><div className="w-4 h-4 rounded-full border-2 border-gray-300"></div></div>
                        <div>Attendee</div>
                        <div>Ticket</div>
                        <div>Status</div>
                        <div>Check-in</div>
                        <div></div>
                    </div>

                    {/* List Content */}
                    <div className="space-y-0 mt-2">
                        {attendee.map((acs) => (
                            <AttendeeListItem
                                key={acs.register.registrationId}
                                single_attendee={acs.a}
                                attendee_user={acs.user}
                                attendee_reg={acs.register}
                                handleOnClick={handleOnClick}
                                handleCheckBoxChange={handleCheckBoxChange}
                                isSelected={selected_ids.includes(acs.register.registrationId)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            {single_attendee_view && (
                <div className="w-[400px] shrink-0 border-l border-gray-200 h-full overflow-y-auto bg-gray-100 shadow-[-8px_0_30px_rgba(0,0,0,0.04)] animate-in slide-in-from-right-8 duration-300">
                    <SingleAttendeeView
                        combined_data={single_attendee_view}
                        onClose={() => set_single_attendee_view(null)}
                        update_registration ={handle_reg_status}
                    />
                </div>
            )}

            {/* Floating Selection Action Bar */}
            {selected_ids.length > 0 && (
                <div className="absolute bottom-8 left-[calc(50%-200px)] -translate-x-1/2 bg-black text-white pl-6 pr-8 py-3 rounded-[2rem] flex items-center gap-6 shadow-2xl z-50 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-4 border-r border-gray-700 pr-6">
                        <span className="font-black text-xl leading-none">{selected_ids.length}</span>
                        <span className="text-[10px] font-extrabold tracking-widest text-gray-500 mt-0.5">SELECTED</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <button className="text-gray-300 hover:text-white transition-colors"><Mail size={18} /></button>
                        <button className="text-gray-300 hover:text-white transition-colors"><MessageSquare size={18} /></button>
                        <button className="text-gray-300 hover:text-white transition-colors"><Download size={18} /></button>
                        <button className="text-gray-300 hover:text-white transition-colors"><CheckCircle size={18} /></button>
                    </div>
                </div>
            )}
        </div>
    )
}