"use client";
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState, useCallback, useMemo, useEffect } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { AttendeeInput } from "./AttendeeInput";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ExportButton } from "@/src/features/exports/components/ExportButton";
import type { ExportResult } from "@/src/features/exports/types";
import { Users, UserCheck, Clock, Ban } from "lucide-react";
import type { ReactNode } from "react";
import { Registration } from "@/src/services/models/reg.type";
import { useSearchParams } from "next/navigation";
import { GroupedAttendeeList, type GroupedAttendeeGroup } from "./GroupedAttendeeList";
import { TeamGroupView } from "./TeamGroupView";
import {
  BulkAttendeeEmailModal,
  RegistrationEmailsModal,
  EmailConnectionRequiredBanner,
} from "./EventEmailPanels";
import type { EventEmailTemplate } from "../emailTypes";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import {
  filtersAreActive,
  readRosterFilters,
  registrationMatchesFilters,
  rosterStats,
  teamMetaMatches,
} from "../roster";

export interface AttendeeTeamGroup {
  id: string;
  name: string;
  trackName: string;
  accessCode: string | null;
  memberIds: string[];
  leadId?: string | null;
  payment?: string | null;
  amount?: number;
  currency?: string;
  proofUrl?: string | null;
  trackId?: string | null;
}

export interface AttendeeClientSideProp {
  a: Attendee;
  user: User;
  register: Registration;
  /** Signed URLs for file-type custom_responses keys. */
  answerFileUrls?: Record<string, string> | null;
  /**
   * A freshly signed URL for `register.payment.proofPath`, or null when there is
   * no proof. Minted on the server per render because the proofs bucket is
   * private and signed links expire -- the document stores a storage key, never
   * a URL.
   */
  proofUrl?: string | null;
}

export function AttendeeClientSide({
  attendees = [],
  handle_reg_status,
  onExport,
  requiresApproval = false,
  extra,
  occupyingCount,
  teams,
  groups,
  defaultGrouped = false,
  eventId,
  organizerId,
  emailTemplates = [],
  questions = [],
  isFree = false,
  resendTestMode = false,
  emailConnectionMissing = false,
}: {
  attendees: AttendeeClientSideProp[] | [];
  handle_reg_status: (reg: Registration) => Promise<void>;
  onExport?: () => Promise<ExportResult>;
  requiresApproval?: boolean;
  extra?: ReactNode;
  occupyingCount?: number;
  teams?: AttendeeTeamGroup[];
  groups?: GroupedAttendeeGroup[];
  defaultGrouped?: boolean;
  eventId?: string;
  organizerId?: string;
  emailTemplates?: EventEmailTemplate[];
  questions?: CustomFieldOption[];
  isFree?: boolean;
  /** @deprecated Use emailConnectionMissing */
  resendTestMode?: boolean;
  emailConnectionMissing?: boolean;
}) {
  const [open_registration_id, set_open_registration_id] = useState<string | null>(null);
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [view, setView] = useState<"grouped" | "flat">(defaultGrouped ? "grouped" : "flat");
  const searchParams = useSearchParams();

  useEffect(() => {
    const team = searchParams.get("team");
    if (team) {
      setExpandedTeamId(team);
      setOpenTeamId(team);
      set_open_registration_id(null);
    }
  }, [searchParams]);

  const handleOnClick = useCallback((registration_id: string) => {
    setOpenTeamId(null);
    set_open_registration_id(registration_id);
  }, []);

  const stats = useMemo(() => rosterStats(attendees, occupyingCount), [attendees, occupyingCount]);
  const filters = useMemo(() => readRosterFilters(searchParams), [searchParams]);
  const filtering = filtersAreActive(filters);

  const teamLookup = useMemo(() => {
    const map = new Map<string, AttendeeTeamGroup>();
    for (const t of teams ?? []) {
      for (const id of t.memberIds) map.set(id, t);
    }
    return map;
  }, [teams]);

  const attendee = useMemo<AttendeeClientSideProp[]>(() => {
    return attendees.filter((s) => {
      const team = teamLookup.get(s.register.registrationId);
      const group = (groups ?? []).find((g) =>
        g.members.some((m) => m.register.registrationId === s.register.registrationId),
      );
      return registrationMatchesFilters(s, filters, {
        teamName: team?.name ?? group?.name,
        trackName: team?.trackName ?? group?.subtitle,
        accessCode: team?.accessCode ?? group?.accessCode,
      });
    });
  }, [attendees, filters, groups, teamLookup]);

  const handleQuickStatusChange = useCallback(
    async (reg: Registration, newStatus: "confirmed" | "rejected") => {
      const updated: Registration = {
        ...reg,
        status: newStatus,
        statusHistory: [
          ...(reg.statusHistory || []),
          { status: newStatus, timestamp: new Date().toISOString() },
        ],
      };
      await handle_reg_status(updated);
    },
    [handle_reg_status],
  );

  const open_attendee =
    attendees.find((a) => a.register.registrationId === open_registration_id) ?? null;
  const openTeamMeta = (teams ?? []).find((t) => t.id === openTeamId) ?? null;
  const openGroup = (groups ?? []).find((g) => g.id === openTeamId) ?? null;

  const tracks = useMemo(() => {
    const names = new Set<string>();
    for (const t of teams ?? []) if (t.trackName) names.add(t.trackName);
    for (const g of groups ?? []) if (g.subtitle) names.add(g.subtitle);
    return [...names];
  }, [groups, teams]);

  const groupedCards: GroupedAttendeeGroup[] = useMemo(() => {
    if (groups?.length) {
      return groups
        .map((g) => {
          const matchingMembers = g.members.filter((m) =>
            attendee.some((a) => a.register.registrationId === m.register.registrationId),
          );
          const extras = { teamName: g.name, trackName: g.subtitle, accessCode: g.accessCode };
          const show = matchingMembers.length > 0 || teamMetaMatches(filters, extras);
          return {
            ...g,
            members: show ? (matchingMembers.length ? matchingMembers : g.members) : [],
          };
        })
        .filter((g) => g.members.length);
    }
    return (teams ?? [])
      .map((team) => {
        const members = attendees.filter((a) => team.memberIds.includes(a.register.registrationId));
        const matching = members.filter((a) =>
          attendee.some((x) => x.register.registrationId === a.register.registrationId),
        );
        const extras = {
          teamName: team.name,
          trackName: team.trackName,
          accessCode: team.accessCode,
        };
        const show = matching.length > 0 || teamMetaMatches(filters, extras);
        if (!show) return { id: team.id, name: team.name, members: [] as AttendeeClientSideProp[] };
        return {
          id: team.id,
          name: team.name,
          subtitle: team.trackName,
          accessCode: team.accessCode,
          payment: team.payment,
          amount: team.amount,
          currency: team.currency,
          proofUrl: team.proofUrl,
          members: matching.length ? matching : members,
        };
      })
      .filter((g) => g.members.length);
  }, [attendee, attendees, filters, groups, teams]);

  const leftover = useMemo(() => {
    if (groups?.length) {
      return attendee.filter(
        (a) =>
          !(groups ?? []).some((g) =>
            g.members.some((m) => m.register.registrationId === a.register.registrationId),
          ),
      );
    }
    return attendee.filter(
      (a) => !(teams ?? []).some((t) => t.memberIds.includes(a.register.registrationId)),
    );
  }, [attendee, groups, teams]);

  const memberOfTeam = open_attendee
    ? Boolean(
        teamLookup.get(open_attendee.register.registrationId) ||
        (groups ?? []).some((g) =>
          g.members.some(
            (m) => m.register.registrationId === open_attendee.register.registrationId,
          ),
        ),
      )
    : false;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <h2 className="font-display text-xl text-ink">
            {(teams?.length || groups?.length) && view === "grouped" ? "Groups" : "Attendees"}
          </h2>
          <div className="flex items-center gap-3">
            {teams?.length || groups?.length || defaultGrouped ? (
              <div className="flex rounded-full border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setView("grouped")}
                  className={`rounded-full px-3 py-1.5 ${view === "grouped" ? "bg-ink text-ink-invert" : "text-ink-soft"}`}
                >
                  Grouped
                </button>
                <button
                  type="button"
                  onClick={() => setView("flat")}
                  className={`rounded-full px-3 py-1.5 ${view === "flat" ? "bg-ink text-ink-invert" : "text-ink-soft"}`}
                >
                  Flat
                </button>
              </div>
            ) : null}
            {onExport ? <ExportButton run={onExport} label="Export attendees" /> : null}
          </div>
        </div>

        <section className="mb-8 grid grid-cols-2 rounded-xl border border-line bg-paper shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-line">
          <MetricTile
            label={occupyingCount != null ? "Team registrations" : "People on list"}
            value={`${stats.total}`}
            icon={<Users className="h-4 w-4" />}
            sublabel={
              occupyingCount != null
                ? `${stats.people} people on the list`
                : "Non-cancelled registrations"
            }
          />
          <MetricTile
            label="Checked in"
            value={`${stats.checkedIn}`}
            icon={<UserCheck className="h-4 w-4" />}
            sublabel={`${stats.checkedInPercent}% of people`}
          />
          <MetricTile
            label="Pending"
            value={`${stats.pending}`}
            icon={<Clock className="h-4 w-4" />}
            sublabel="Registered, not checked in"
          />
          <MetricTile
            label="Cancelled"
            value={`${stats.cancelled}`}
            icon={<Ban className="h-4 w-4" />}
            sublabel="Cancelled, rejected, or no-show"
          />
        </section>

        <div className="mb-6">
          <AttendeeInput tracks={tracks} hidePayment={isFree} />
        </div>

        {extra}

        {eventId && organizerId ? (
          <div className="mb-6 space-y-3">
            <EmailConnectionRequiredBanner
              show={emailConnectionMissing || resendTestMode}
              organizerId={organizerId}
            />
            <div className="flex flex-wrap gap-2">
              <BulkAttendeeEmailModal
                eventId={eventId}
                organizerId={organizerId}
                hasTeams={Boolean(teams?.length || groups?.length)}
                hidePayment={isFree}
              />
              <RegistrationEmailsModal
                eventId={eventId}
                organizerId={organizerId}
                templates={emailTemplates}
                hidePayment={isFree}
              />
            </div>
          </div>
        ) : null}

        {attendee.length === 0 && leftover.length === 0 && groupedCards.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
            <EmptyState
              icon={<Users className="h-6 w-6 text-primary" />}
              title={filtering ? "No attendees match that search" : "No one has registered yet"}
              description={
                filtering
                  ? "Try part of a name, or clear the filters to see everyone."
                  : "Share the event's registration link. Everyone who signs up appears here with their ticket, payment and check-in state."
              }
            />
          </div>
        ) : view === "grouped" && (teams?.length || groups?.length) ? (
          <GroupedAttendeeList
            groups={groupedCards}
            leftover={leftover}
            expandedId={expandedTeamId}
            onToggle={(id) => setExpandedTeamId((cur) => (cur === id ? null : id))}
            onOpenTeam={(id) => {
              set_open_registration_id(null);
              setOpenTeamId(id);
            }}
            handleOnClick={handleOnClick}
            openRegistrationId={open_registration_id}
            onQuickStatusChange={handleQuickStatusChange}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm">
            <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr] border-b border-line bg-muted/30 px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
              <div>Attendee</div>
              <div>Ticket</div>
              <div>Status</div>
              <div>Check-in / Action</div>
            </div>

            <div className="divide-y divide-line">
              {attendee.map((acs) => (
                <AttendeeListItem
                  key={acs.register.registrationId}
                  attendee_user={acs.user}
                  attendee_reg={acs.register}
                  handleOnClick={handleOnClick}
                  isOpen={acs.register.registrationId === open_registration_id}
                  onQuickStatusChange={handleQuickStatusChange}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {openTeamMeta || openGroup ? (
        <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-line bg-paper shadow-sm lg:sticky lg:top-8 lg:h-fit lg:w-[400px]">
          {openTeamMeta ? (
            <TeamGroupView
              team={openTeamMeta}
              members={attendees.filter((a) =>
                openTeamMeta.memberIds.includes(a.register.registrationId),
              )}
              onClose={() => setOpenTeamId(null)}
              eventId={eventId}
              update_registration={handle_reg_status}
              requiresApproval={requiresApproval}
              hidePayment={isFree}
            />
          ) : openGroup ? (
            <TeamGroupView
              team={{
                id: openGroup.id,
                name: openGroup.name,
                trackName: openGroup.subtitle ?? "",
                accessCode: openGroup.accessCode ?? null,
                memberIds: openGroup.members.map((m) => m.register.registrationId),
                leadId: openGroup.members[0]?.register.registrationId,
                payment: openGroup.payment,
                amount: openGroup.amount,
                currency: openGroup.currency,
                proofUrl: openGroup.proofUrl,
              }}
              members={openGroup.members}
              onClose={() => setOpenTeamId(null)}
              eventId={eventId}
              update_registration={handle_reg_status}
              requiresApproval={requiresApproval}
              hidePayment={isFree}
            />
          ) : null}
        </aside>
      ) : open_attendee ? (
        <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-line bg-paper shadow-sm lg:sticky lg:top-8 lg:h-fit lg:w-[400px]">
          <SingleAttendeeView
            requiresApproval={requiresApproval}
            combined_data={open_attendee}
            onClose={() => set_open_registration_id(null)}
            update_registration={handle_reg_status}
            variant={memberOfTeam ? "member" : "full"}
            eventId={eventId}
            competitionName={teamLookup.get(open_attendee.register.registrationId)?.trackName}
            questions={questions}
            hidePayment={isFree}
          />
        </aside>
      ) : null}
    </div>
  );
}
