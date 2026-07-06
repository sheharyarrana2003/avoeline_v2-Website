"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { AttendeeInput } from "./AttendeeInput";
import { AttendeeCard } from "./AttendeeCard";
import { Mail, MessageSquare, Download, CheckCircle, Trash2, Calendar, Ticket } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export interface AttendeeClientSideProp {
    a: Attendee,
    user: User
}

export function AttendeeClientSide({ attendees = [] }: { attendees: AttendeeClientSideProp[]|[] }) {
    console.log("in elicne tsisdeee ");
    console.log(attendees)
    const [selected_ids, set_selected_ids] = useState<String[]>([]);
    const [single_attendee_view, set_single_attendee_view] = useState<AttendeeClientSideProp | null>(null);
    const searchParams = useSearchParams();

    const handleOnClick = (attendee_id: string, user_id: string) => {
        const target = attendees.find((a) => a.user.userId === user_id) || null;
        if (target) {
            set_single_attendee_view(target);
        }
    }

    const handleCheckBoxChange = (e: React.ChangeEvent<HTMLInputElement>, attendee_id: string) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            set_selected_ids([...selected_ids, attendee_id]);
        } else {
            set_selected_ids((prev_arr) => prev_arr.filter(item => item !== attendee_id));
        }
    }

    const handleMassDelete = () => {
        console.log("Deleting these", selected_ids);
    }

    const getAnalytics = () => {
        const total = attendees.length;
        let checkedIn = 0;
        let cancelled = 0;
        let pending = 0;

        attendees.forEach((item) => {
            const status = (item.user?.accountStatus === "active" ? "REGISTERED" : "PENDING");
            const isCheckedIn = status === "CHECKED IN" || status === "CHECKED_IN" || item.a?.isCheckedIn === true;

            if (isCheckedIn) {
                checkedIn++;
            } else if (status === "CANCELLED") {
                cancelled++;
            } else {
                pending++;
            }
        });

        const checkedInPercent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
        return { total, checkedIn, pending, cancelled, checkedInPercent };
    };

    const stats = getAnalytics();
    let attendee: AttendeeClientSideProp[] = [];

    if (searchParams.get("value")) {
        const query = searchParams.get("value");
        const regex = new RegExp(String(query), "i");
        attendee = attendees.filter((s) => regex.test(s.user.profile.fullName));
    } else {
        attendee = attendees;
    }

    return (
        <div className="flex h-screen w-full relative overflow-hidden bg-[#f8f9fa]">
            
            {/* Main Left Content */}
            <div className="flex-1 overflow-y-auto p-8 pb-32">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight">TechVerse Hackathon 2026</h1>
                        <span className="bg-gray-200 h-6 w-12 rounded-full"></span>
                    </div>

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <AttendeeCard title="TOTAL\nREGISTERED" value={stats.total || "0"} />
                        <AttendeeCard title="CHECKED IN" value={stats.checkedIn || "0"} subValue={`${stats.checkedInPercent || "0"}%`} />
                        <AttendeeCard title="PENDING" value={stats.pending || "0"} />
                        <AttendeeCard title="CANCELLED" value={stats.cancelled || "0"} />
                    </div>

                    {/* Filters & Search */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1">
                            <AttendeeInput />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                            <Calendar size={16} className="text-gray-400" /> Date
                        </button>
                        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                            <Ticket size={16} className="text-gray-400" /> Ticket Type
                        </button>
                    </div>

                    {/* List Headers */}
                    <div className="grid grid-cols-[40px_2.5fr_1fr_1fr_1fr_40px] px-6 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-200/50">
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
                                key={acs.a.attendeeId}
                                single_attendee={acs.a}
                                attendee_user={acs.user}
                                handleOnClick={handleOnClick}
                                handleCheckBoxChange={handleCheckBoxChange}
                                isSelected={selected_ids.includes(acs.a.attendeeId)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            {single_attendee_view && (
                <div className="w-[400px] shrink-0 border-l border-gray-200 h-full overflow-y-auto bg-[#eef0f4] shadow-[-8px_0_30px_rgba(0,0,0,0.04)] animate-in slide-in-from-right-8 duration-300">
                    <SingleAttendeeView
                        combined_data={single_attendee_view}
                        onClose={() => set_single_attendee_view(null)}
                    />
                </div>
            )}

            {/* Floating Selection Action Bar */}
            {selected_ids.length > 0 && (
                <div className="absolute bottom-8 left-[calc(50%-200px)] -translate-x-1/2 bg-[#0a0a0a] text-white pl-6 pr-8 py-3 rounded-[2rem] flex items-center gap-6 shadow-2xl z-50 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-4 border-r border-gray-700 pr-6">
                        <span className="font-black text-xl leading-none">{selected_ids.length}</span>
                        <span className="text-[10px] font-extrabold tracking-widest text-gray-400 mt-0.5">SELECTED</span>
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