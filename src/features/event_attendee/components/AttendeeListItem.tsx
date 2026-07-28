"use client"
import { memo } from "react";
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { Registration } from "@/src/services/models/reg.type";
import { MoreHorizontal } from "lucide-react";
import { formatDateTime } from "@/src/lib/datetime";

function AttendeeListItemBase(
    { single_attendee, attendee_user, attendee_reg,handleOnClick, handleCheckBoxChange, isSelected }:
        {
            single_attendee: Attendee,
            attendee_user: User,
            attendee_reg: Registration
            handleOnClick: (registration_id: string) => void,
            handleCheckBoxChange: (e: React.ChangeEvent<HTMLInputElement>, registration_id: string) => void,
            isSelected: boolean
        }) {

    // Derive check-in from the real registration, not a hardcoded truthy value.
    const isCheckedIn = Boolean(attendee_reg?.checkIn?.checkedIn) || attendee_reg?.status === "checked_in";
    const statusLabel = attendee_reg.status;
    const checkInTime = attendee_reg?.checkIn?.checkInTime || null;
    const ticketType = attendee_reg?.pricingTier || "General";

    return (
        <div 
            className={`grid grid-cols-[40px_2.5fr_1fr_1fr_1fr_40px] items-center px-6 py-4 rounded-xl transition-all cursor-pointer relative mb-1 group ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-gray-100/50'}`}
            onClick={() => handleOnClick(attendee_reg.registrationId)}
        >
            {/* Active Left Border Marker */}
            {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1 bg-black rounded-r-md"></div>}
            
            {/* Checkbox */}
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        className="peer w-[18px] h-[18px] appearance-none border-2 border-gray-300 rounded-full checked:bg-black checked:border-black cursor-pointer transition-colors"
                        onChange={(e) => handleCheckBoxChange(e, attendee_reg.registrationId)}
                        checked={isSelected}
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>

            {/* Attendee Info */}
            <div className="flex items-center gap-3">
                <div className="w-[38px] h-[38px] bg-gradient-to-tr from-orange-200 to-amber-100 rounded-full flex-shrink-0 border border-white shadow-sm overflow-hidden flex items-center justify-center">
                    <span className="text-orange-800 font-bold text-sm">
                        {attendee_user.profile.fullName.charAt(0)}
                    </span>
                </div>
                <div>
                    <p className="text-[15px] font-bold text-slate-900 leading-tight">
                        {attendee_user.profile.fullName}
                    </p>
                    <p className="text-[13px] text-gray-500 font-medium">
                        {attendee_user.email}
                    </p>
                </div>
            </div>

            {/* Ticket Badge */}
            <div>
                <span className="bg-white border border-gray-200 text-slate-800 text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                    {ticketType}
                </span>
            </div>

            {/* Status Badge */}
            <div>
                <span className={`text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider ${isCheckedIn ? 'bg-black text-white shadow-md' : 'bg-transparent text-gray-400 border border-gray-300'}`}>
                    {statusLabel}
                </span>
            </div>

            {/* Check-in Time */}
            <div>
                {isCheckedIn ? (
                    <p className="text-[13px] font-bold text-slate-900">
                        {checkInTime ? formatDateTime(checkInTime) : "Checked in"}
                    </p>
                ) : (
                    <p className="text-[13px] font-bold text-gray-400">—</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-center">
                <button className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={18} />
                </button>
            </div>
        </div>
    )
}

// Memoized so rows don't all re-render when the parent state changes (search
// keystroke, selecting another row); only rows whose props changed re-render.
export const AttendeeListItem = memo(AttendeeListItemBase);