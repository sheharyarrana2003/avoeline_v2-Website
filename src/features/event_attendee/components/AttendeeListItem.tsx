"use client";

import { memo } from "react";
import { User } from "@/src/services/models/user.type";
import { Registration } from "@/src/services/models/reg.type";
import { formatDateTime } from "@/src/lib/datetime";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { registrantIdentity } from "@/src/features/event_attendee/registrantIdentity";
import { approveDisabledReason } from "@/src/features/event_attendee/approveDisabledReason";
import { isCheckedIn as rosterCheckedIn } from "@/src/features/event_attendee/roster";

function AttendeeListItemBase({
  attendee_user,
  attendee_reg,
  handleOnClick,
  isOpen,
  onQuickStatusChange,
  isPaid = false,
  competitionName = "",
  selected = false,
  onToggleSelect,
}: {
  attendee_user: User;
  attendee_reg: Registration;
  handleOnClick: (registration_id: string) => void;
  isOpen: boolean;
  onQuickStatusChange?: (reg: Registration, newStatus: "confirmed" | "rejected") => void;
  isPaid?: boolean;
  competitionName?: string;
  selected?: boolean;
  onToggleSelect?: (registrationId: string, next: boolean) => void;
}) {
  const identity = registrantIdentity(attendee_reg, attendee_user);
  const checkedIn = rosterCheckedIn(attendee_reg);
  const checkInTime = attendee_reg?.checkIn?.checkInTime || null;
  const ticketOrComp =
    competitionName || attendee_reg?.pricingTier || attendee_reg?.tier || "General";
  const canDecide =
    attendee_reg?.status === "pending" || attendee_reg?.status === "awaiting_payment";
  const approveBlock = approveDisabledReason({
    isPaid,
    status: attendee_reg.status,
    proofPath: attendee_reg.payment?.proofPath,
    paymentStatus: attendee_reg.payment?.paymentStatus,
  });
  const hasProof = Boolean(String(attendee_reg.payment?.proofPath || "").trim());

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
      className={`grid w-full grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isOpen ? "bg-muted" : "hover:bg-muted"
      }`}
    >
      <span
        className="flex items-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="size-4 rounded border-line"
          checked={selected}
          aria-label={`Select ${identity.name}`}
          onChange={(e) => onToggleSelect?.(attendee_reg.registrationId, e.target.checked)}
        />
      </span>

      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-ink">
          {identity.initials}
        </span>
        <span className="block min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{identity.name}</span>
          <span className="block truncate text-xs text-ink-soft">{identity.email || "—"}</span>
          {identity.phone ? (
            <span className="block truncate text-xs text-ink-soft tabular-nums">
              {identity.phone}
            </span>
          ) : null}
          {attendee_reg.shortCode ? (
            <span className="mt-0.5 block truncate font-mono text-2xs tracking-wide text-ink-soft">
              {attendee_reg.shortCode}
            </span>
          ) : null}
        </span>
      </span>

      <span className="min-w-0">
        <span className="block truncate text-xs uppercase text-ink-soft">{ticketOrComp}</span>
        {isPaid ? (
          <span className="mt-0.5 block truncate text-2xs capitalize text-ink-soft">
            {attendee_reg.payment?.paymentStatus || "—"}
            {hasProof ? " · proof" : ""}
          </span>
        ) : null}
      </span>

      <span>
        <StatusBadge status={attendee_reg.status} size="sm" />
      </span>

      <span className="truncate text-xs text-ink-soft tabular-nums">
        {checkedIn ? (checkInTime ? formatDateTime(checkInTime) : "Checked in") : "Not in"}
      </span>

      <div className="flex items-center justify-end">
        {canDecide ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={Boolean(approveBlock)}
              title={approveBlock || undefined}
              onClick={() => {
                if (approveBlock) return;
                onQuickStatusChange?.(attendee_reg, "confirmed");
              }}
              className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-semibold text-white shadow-xs transition enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onQuickStatusChange?.(attendee_reg, "rejected")}
              className="rounded-md border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        )}
      </div>
    </div>
  );
}

export const AttendeeListItem = memo(AttendeeListItemBase);
