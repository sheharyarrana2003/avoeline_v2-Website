"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { Divide } from "lucide-react";
import { Mail, MessageSquare, Download, CheckCircle, Trash2 } from "lucide-react";
import { AttendeeInput } from "./AttendeeInput";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface AttendeeClientSideProp {
    a: Attendee,
    user: User
}
export function AttendeeClientSide({ attendees = [] }: { attendees: AttendeeClientSideProp[] }) {
    const [selected_ids, set_selected_ids] = useState<String[]>([]);
    const [single_attendee_view, set_single_attendee_view] = useState<AttendeeClientSideProp | null>(null);

    const handleOnClick = (attendee_id: string, user_id: string) => {
        // console.log("This attendee was clicked => ", attendee_id);
        // console.log("This user was clicked => ", user_id);

        const target = attendee.find((a) => a.user.userId === user_id) || null;
        if (target) {
            set_single_attendee_view(target);
        } else {
            console.log("No matching attendee found for this user ID.");
        }


    }

    const handleCheckBoxChange = (e: React.ChangeEvent<HTMLInputElement>, attendee_id: string) => {
        const isChecked = e.target.checked;
        // console.log("Checkbox clicked! Is it checked?", isChecked);
        if (isChecked) {
            console.log("Addin this  -> ", attendee_id)
            set_selected_ids([...selected_ids, attendee_id]);
        } else {
            set_selected_ids((prev_arr) => prev_arr.filter(item => item !== attendee_id));
        }
    }

    const handleMassDelete = () => {
        console.log("Deleteing these");
        console.log(selected_ids);
    }

    const searchParams = useSearchParams();
    console.log(searchParams);
    console.log("after string");
    console.log(searchParams.toString());
    const getAnalytics = () => {
        const total = attendees.length; // Use the raw un-filtered list for top stats!
        let checkedIn = 0;
        let cancelled = 0;
        let pending = 0;

        attendees.forEach((item) => {
            // Determine status exactly like SingleAttendeeView does
            const status =  (item.user?.accountStatus === "active" ? "REGISTERED" : "PENDING");
            const isCheckedIn = status === "CHECKED IN" || status === "CHECKED_IN" || item.a?.isCheckedIn === true;

            if (isCheckedIn) {
                checkedIn++;
            } else if (status === "CANCELLED") {
                cancelled++;
            } else {
                pending++; // Anything else (Pending/Registered)
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
        <div className="flex h-full w-full relative overflow-hidden bg-white">

            <div className="flex-1 overflow-y-auto pb-32">
                <div className="space-y-4">

                    <AttendeeInput />
                    {attendee.map((acs) => (
                        <AttendeeListItem
                            key={acs.a.attendeeId}
                            single_attendee={acs.a}
                            attendee_user={acs.user}
                            handleOnClick={handleOnClick}
                            handleCheckBoxChange={handleCheckBoxChange}
                        />
                    ))}
                </div>
            </div>

            {single_attendee_view && (
                <div className="w-[420px] shrink-0 border-l border-gray-200 h-full overflow-y-auto bg-[#f8f9fa] shadow-[-8px_0_30px_rgba(0,0,0,0.04)] animate-in slide-in-from-right-8 duration-300">
                    <SingleAttendeeView
                        combined_data={single_attendee_view}
                        onClose={() => set_single_attendee_view(null)}
                    />
                </div>
            )}

            {selected_ids.length > 0 && (

                <div className="absolute bottom-8 left-[calc(50%-210px)] -translate-x-1/2 bg-[#0a0a0a] text-white px-8 py-4 rounded-[2rem] flex items-center gap-8 shadow-2xl z-50 animate-in slide-in-from-bottom-8">
                    <p>Currently Selected : {selected_ids.length}</p>
                    <div className="flex flex-col items-center justify-center border-r border-gray-700 pr-8">
                        <span className="font-bold text-xl leading-none">{selected_ids.length}</span>
                        <span className="text-[10px] font-extrabold tracking-widest text-gray-400 mt-1">SELECTED</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="text-gray-300 hover:text-white transition-colors"><Mail size={20} /></button>
                        <button className="text-gray-300 hover:text-white transition-colors"><MessageSquare size={20} /></button>
                        <button className="text-gray-300 hover:text-white transition-colors"><Download size={20} /></button>
                        <button className="text-gray-300 hover:text-white transition-colors"><CheckCircle size={20} /></button>

                        <div className="w-px h-6 bg-gray-700 mx-2"></div>

                        <button
                            onClick={handleMassDelete}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete Selected"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            )}

        </div>
    )

}
