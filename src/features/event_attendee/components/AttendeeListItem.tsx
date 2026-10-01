"use client"
import { memo } from "react";
import { User } from "@/src/services/models/user.type";
import { Registration } from "@/src/services/models/reg.type";
import { formatDateTime } from "@/src/lib/datetime";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";

function AttendeeListItemBase(
    { attendee_user, attendee_reg, handleOnClick, isOpen, onQuickStatusChange }:
        {
            attendee_user: User,
            attendee_reg: Registration
            handleOnClick: (registration_id: string) => void,
            isOpen: boolean,
            onQuickStatusChange?: (reg: Registration, newStatus: "confirmed" | "rejected") => void,
        }) {

    // Derive check-in from the real registration, not a hardcoded truthy value.
    const isCheckedIn = Boolean(attendee_reg?.checkIn?.checkedIn) || attendee_reg?.status === "checked_in";
    const checkInTime = attendee_reg?.checkIn?.checkInTime || null;
    const ticketType = attendee_reg?.pricingTier || "General";
    const isPending = attendee_reg?.status === "pending";

    return (
        <div
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            onClick={() => handleOnClick(attendee_reg.registrationId)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOnClick(attendee_reg.registrationId);
                }
            }}
            className={`grid w-full grid-cols-[2.5fr_1fr_1fr_1fr] items-center gap-2 rounded-lg px-4 py-3 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${isOpen ? "bg-muted" : "hover:bg-muted"}`}
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

            <div className="flex items-center">
                {isPending ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => onQuickStatusChange?.(attendee_reg, "confirmed")}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            onClick={() => onQuickStatusChange?.(attendee_reg, "rejected")}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition"
                        >
                            Reject
                        </button>
                    </div>
                ) : (
                    <span className="truncate text-xs text-ink-soft tabular-nums">
                        {isCheckedIn ? (checkInTime ? formatDateTime(checkInTime) : "Checked in") : "—"}
                    </span>
                )}
            </div>
        </div>
    );
}

// Memoized so rows don't all re-render when the parent state changes (search
// keystroke, opening another row); only rows whose props changed re-render.
export const AttendeeListItem = memo(AttendeeListItemBase);
