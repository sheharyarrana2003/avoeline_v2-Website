"use client"
import { memo } from "react";
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { Registration } from "@/src/services/models/reg.type";
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
                        aria-label={`Select ${attendee_user.profile.fullName}`}
                        className="peer w-[18px] h-[18px] appearance-none border-2 border-gray-300 rounded-full checked:bg-black checked:border-black cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        onChange={(e) => handleCheckBoxChange(e, attendee_reg.registrationId)}
                        checked={isSelected}
                    />
                    <svg aria-hidden="true" className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>

            {/* Attendee Info — the real control. The row-wide onClick above is a
                pointer convenience; this button is what keyboard and screen
                reader users actually reach, and the attendee's name is the best
                label it could have. */}
            <button
                type="button"
                aria-pressed={isSelected}
                onClick={(e) => {
                    e.stopPropagation();
                    handleOnClick(attendee_reg.registrationId);
                }}
                className="flex items-center gap-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                <span className="w-[38px] h-[38px] bg-gradient-to-tr from-orange-200 to-amber-100 rounded-full flex-shrink-0 border border-white shadow-sm overflow-hidden flex items-center justify-center">
                    <span className="text-orange-800 font-bold text-sm">
                        {attendee_user.profile.fullName.charAt(0)}
                    </span>
                </span>
                <span className="block">
                    <span className="block text-[15px] font-bold text-gray-900 leading-tight">
                        {attendee_user.profile.fullName}
                    </span>
                    <span className="block text-[13px] text-gray-500 font-medium">
                        {attendee_user.email}
                    </span>
                </span>
            </button>

            {/* Ticket Badge */}
            <div>
                <span className="bg-white border border-gray-200 text-gray-800 text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
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
                    <p className="text-[13px] font-bold text-gray-900">
                        {checkInTime ? formatDateTime(checkInTime) : "Checked in"}
                    </p>
                ) : (
                    <p className="text-[13px] font-bold text-gray-400">—</p>
                )}
            </div>

            {/* Actions column, kept empty to stay aligned with the header row.
                It used to hold a hover-revealed "more" button with no onClick --
                an affordance that did nothing when clicked. */}
            <div />
        </div>
    )
}

// Memoized so rows don't all re-render when the parent state changes (search
// keystroke, selecting another row); only rows whose props changed re-render.
export const AttendeeListItem = memo(AttendeeListItemBase);