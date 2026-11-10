"use client";

import { useMemo } from "react";
import { ChevronDown, Download } from "lucide-react";
import { AttendeeListItem } from "./AttendeeListItem";
import type { AttendeeClientSideProp } from "./AttendeeClientSide";
import type { Registration } from "@/src/services/models/reg.type";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatCurrency } from "@/src/lib/money";

export type GroupedAttendeeGroup = {
  id: string;
  name: string;
  members: AttendeeClientSideProp[];
  payment?: string | null;
  feeStatus?: string | null;
  accessCode?: string | null;
  joinCode?: string | null;
  subtitle?: string;
  amount?: number;
  currency?: string;
  proofUrl?: string | null;
};

export function GroupedAttendeeList({
  groups,
  leftover,
  expandedId,
  onToggle,
  onOpenTeam,
  handleOnClick,
  openRegistrationId,
  onQuickStatusChange,
  isPaid = false,
  selectedIds,
  onToggleSelect,
}: {
  groups: GroupedAttendeeGroup[];
  leftover: AttendeeClientSideProp[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onOpenTeam: (id: string) => void;
  handleOnClick: (registration_id: string) => void;
  openRegistrationId: string | null;
  onQuickStatusChange: (reg: Registration, newStatus: "confirmed" | "rejected") => void;
  isPaid?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (registrationId: string, next: boolean) => void;
}) {
  const visible = useMemo(() => groups.filter((g) => g.members.length), [groups]);

  return (
    <div className="space-y-3">
      {visible.map((group) => {
        const open = expandedId === group.id;
        const hasAmount = typeof group.amount === "number" && group.amount > 0;
        const paymentStatus = hasAmount && group.payment === "not_required" ? null : group.payment;
        return (
          <div
            key={group.id}
            className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm"
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => onOpenTeam(group.id)}
                className="min-w-0 flex-1 text-left hover:opacity-90"
              >
                <span className="block truncate text-sm font-medium text-ink">{group.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  {group.subtitle ? <span>{group.subtitle}</span> : null}
                  {group.subtitle ? <span aria-hidden="true">·</span> : null}
                  <span>
                    {group.members.length} {group.members.length === 1 ? "member" : "members"}
                  </span>
                  {hasAmount ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-ink">
                        {formatCurrency(group.amount!, group.currency || "PKR")}
                      </span>
                    </>
                  ) : null}
                  {paymentStatus ? (
                    <StatusBadge status={paymentStatus} size="sm" marker="dot" />
                  ) : null}
                </span>
              </button>
              {group.joinCode || group.accessCode ? (
                <span
                  className="hidden max-w-[10rem] shrink-0 truncate font-mono text-2xs tracking-wide text-ink-soft sm:inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    const t = [group.joinCode, group.accessCode].filter(Boolean).join(" · ");
                    void navigator.clipboard.writeText(t);
                  }}
                  title="Copy team codes"
                >
                  {[group.joinCode, group.accessCode].filter(Boolean).join(" · ")}
                </span>
              ) : null}
              {group.proofUrl ? (
                <a
                  href={group.proofUrl}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-ink-soft hover:text-ink"
                  aria-label="Download payment proof"
                  title="Download proof"
                >
                  <Download size={14} />
                </a>
              ) : null}
              <button
                type="button"
                aria-expanded={open}
                aria-label={open ? "Hide members" : "Show members"}
                onClick={() => onToggle(group.id)}
                className="shrink-0 rounded-md p-1 text-ink-soft hover:bg-muted hover:text-ink"
              >
                <ChevronDown size={16} className={open ? "rotate-180" : ""} />
              </button>
            </div>
            {open ? (
              <div className="border-t border-line">
                <div className="grid grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1fr)_auto_auto_auto] border-b border-line bg-muted/30 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
                  <div aria-hidden="true" />
                  <div>Member</div>
                  <div>Ticket</div>
                  <div>Status</div>
                  <div>Check-in</div>
                  <div className="text-right">Action</div>
                </div>
                <div className="divide-y divide-line">
                  {group.members.map((acs) => (
                    <AttendeeListItem
                      key={acs.register.registrationId}
                      attendee_user={acs.user}
                      attendee_reg={acs.register}
                      handleOnClick={handleOnClick}
                      isOpen={acs.register.registrationId === openRegistrationId}
                      onQuickStatusChange={onQuickStatusChange}
                      isPaid={isPaid}
                      competitionName={group.subtitle || ""}
                      selected={selectedIds?.has(acs.register.registrationId) ?? false}
                      onToggleSelect={onToggleSelect}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {leftover.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm">
          <p className="border-b border-line px-5 py-4 text-sm font-medium text-ink">
            Unassigned people
          </p>
          <div className="divide-y divide-line">
            {leftover.map((acs) => (
              <AttendeeListItem
                key={acs.register.registrationId}
                attendee_user={acs.user}
                attendee_reg={acs.register}
                handleOnClick={handleOnClick}
                isOpen={acs.register.registrationId === openRegistrationId}
                onQuickStatusChange={onQuickStatusChange}
                isPaid={isPaid}
                selected={selectedIds?.has(acs.register.registrationId) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
