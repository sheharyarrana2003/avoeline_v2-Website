"use client";

import { useMemo } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import type { AttendeeClientSideProp } from "./AttendeeClientSide";
import type { Registration } from "@/src/services/models/reg.type";

export type GroupedAttendeeGroup = {
  id: string;
  name: string;
  members: AttendeeClientSideProp[];
  payment?: string | null;
  accessCode?: string | null;
  subtitle?: string;
};

export function GroupedAttendeeList({
  groups,
  leftover,
  expandedId,
  onToggle,
  handleOnClick,
  openRegistrationId,
  onQuickStatusChange,
}: {
  groups: GroupedAttendeeGroup[];
  leftover: AttendeeClientSideProp[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  handleOnClick: (registration_id: string) => void;
  openRegistrationId: string | null;
  onQuickStatusChange: (reg: Registration, newStatus: "confirmed" | "rejected") => void;
}) {
  const visible = useMemo(() => groups.filter((g) => g.members.length), [groups]);

  return (
    <div className="space-y-3">
      {visible.map((group) => {
        const open = expandedId === group.id;
        return (
          <div key={group.id} className="overflow-hidden rounded-xl border border-line bg-paper shadow-xs">
            <button
              type="button"
              onClick={() => onToggle(group.id)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{group.name}</span>
                <span className="block text-xs text-ink-soft">
                  {group.subtitle ? `${group.subtitle} · ` : ""}
                  {group.members.length} {group.members.length === 1 ? "member" : "members"}
                  {group.payment ? ` · ${group.payment}` : ""}
                </span>
              </span>
              {group.accessCode ? (
                <span
                  className="font-mono text-xs tracking-wide text-ink"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigator.clipboard.writeText(group.accessCode ?? "");
                  }}
                  title="Copy access code"
                >
                  {group.accessCode}
                </span>
              ) : group.accessCode === null ? (
                <span className="text-xs text-ink-soft">Code after pay + confirm</span>
              ) : null}
            </button>
            {open ? (
              <div className="border-t border-line">
                <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr] border-b border-line bg-muted/30 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
                  <div>Member</div>
                  <div>Ticket</div>
                  <div>Status</div>
                  <div>Check-in / Action</div>
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
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {leftover.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-xs">
          <p className="border-b border-line px-4 py-3 text-sm font-medium text-ink">Unassigned people</p>
          <div className="divide-y divide-line">
            {leftover.map((acs) => (
              <AttendeeListItem
                key={acs.register.registrationId}
                attendee_user={acs.user}
                attendee_reg={acs.register}
                handleOnClick={handleOnClick}
                isOpen={acs.register.registrationId === openRegistrationId}
                onQuickStatusChange={onQuickStatusChange}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
