"use client"
import { memo } from "react";
import { User } from "@/src/services/models/user.type";
import { Registration } from "@/src/services/models/reg.type";
import { formatDateTime } from "@/src/lib/datetime";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";

function AttendeeListItemBase(
    { attendee_user, attendee_reg, handleOnClick, isOpen }:
        {
            attendee_user: User,
            attendee_reg: Registration
            handleOnClick: (registration_id: string) => void,
            isOpen: boolean
        }) {

    // Derive check-in from the real registration, not a hardcoded truthy value.
    const isCheckedIn = Boolean(attendee_reg?.checkIn?.checkedIn) || attendee_reg?.status === "checked_in";
    const checkInTime = attendee_reg?.checkIn?.checkInTime || null;
    const ticketType = attendee_reg?.pricingTier || "General";

    return (
        // One control per row rather than a row-wide onClick plus a nested button:
        // the whole row is the thing you click, so it should be the thing that
        // focuses. The selection checkboxes that used to sit here drove nothing
        // but a floating toolbar whose four buttons had no handlers at all.
        <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => handleOnClick(attendee_reg.registrationId)}
            className={`grid w-full grid-cols-[2.5fr_1fr_1fr_1fr] items-center gap-2 rounded-lg px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${isOpen ? "bg-muted" : "hover:bg-muted"}`}
        >
            <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-ink">
                    {attendee_user.profile.fullName.charAt(0)}
                </span>
                <span className="block min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                        {attendee_user.profile.fullName}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                        {attendee_user.email}
                    </span>
                </span>
            </span>

            <span className="truncate text-xs uppercase text-ink-soft">{ticketType}</span>

            <span><StatusBadge status={attendee_reg.status} size="sm" /></span>

            <span className="truncate text-xs text-ink-soft tabular-nums">
                {isCheckedIn ? (checkInTime ? formatDateTime(checkInTime) : "Checked in") : "—"}
            </span>
        </button>
    )
}

// Memoized so rows don't all re-render when the parent state changes (search
// keystroke, opening another row); only rows whose props changed re-render.
export const AttendeeListItem = memo(AttendeeListItemBase);
