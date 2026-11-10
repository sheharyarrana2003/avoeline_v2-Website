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
import Link from "next/link";
import { GroupedAttendeeList, type GroupedAttendeeGroup } from "./GroupedAttendeeList";
import { TeamGroupView } from "./TeamGroupView";
import {
  BulkAttendeeEmailModal,
  RegistrationEmailsModal,
  EmailConnectionRequiredBanner,
} from "./EventEmailPanels";
import { AttendeeEmailMenu } from "./AttendeeEmailMenu";
import { RegistrationFormDrawer } from "./RegistrationFormDrawer";
import { CheckInLookupBar } from "./CheckInLookupBar";
import type { EventEmailTemplate } from "../emailTypes";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import {
  filtersAreActive,
  hackathonTeamCodesVisible,
  readRosterFilters,
  registrationMatchesFilters,
  rosterStats,
  teamMetaMatches,
} from "../roster";
import { bulkDecideRegistrationsAction } from "@/src/features/event_attendee/actions/bulkDecideRegistrations.action";
import {
  importAttendeesAllowed,
  PAID_IMPORT_TOOLTIP,
} from "@/src/features/event_attendee/importGate";
import { useToast } from "@/src/shared_components/ui/Toast";
import { buttonClass } from "@/src/lib/ui";

export interface AttendeeTeamGroup {
  id: string;
  name: string;
  trackName: string;
  accessCode: string | null;
  joinCode: string | null;
  memberIds: string[];
  leadId?: string | null;
  payment?: string | null;
  feeStatus?: string | null;
  amount?: number;
  currency?: string;
  proofUrl?: string | null;
  trackId?: string | null;
  eliminated?: boolean;
  joinCodeRevoked?: boolean;
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
  /** Drive webViewLink when proof is on organizer Drive (owner open). */
  proofDriveUrl?: string | null;
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
  sheetsConnected = false,
  exportsHref,
  eventEndsAtIso = null,
  checkInByNames = {},
  registrationForm = null,
  importPanel = null,
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
  /** Drive + Sheets in use for this event — link to the Exports tab. */
  sheetsConnected?: boolean;
  exportsHref?: string;
  /** Join-code validity (last phase close or event end). */
  eventEndsAtIso?: string | null;
  /** userId → display name for check-in actors. */
  checkInByNames?: Record<string, string>;
  /** O2: form builder content for the Registration form drawer. */
  registrationForm?: ReactNode;
  /** Free-event Import UI (modal/panel). */
  importPanel?: ReactNode;
}) {
  const [open_registration_id, set_open_registration_id] = useState<string | null>(null);
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [view, setView] = useState<"grouped" | "flat">(defaultGrouped ? "grouped" : "flat");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const searchParams = useSearchParams();
  const toast = useToast();
  const canImport = importAttendeesAllowed(isFree);

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

  const toggleSelect = useCallback((registrationId: string, next: boolean) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(registrationId);
      else copy.delete(registrationId);
      return copy;
    });
  }, []);

  const runBulk = useCallback(
    async (decision: "approve" | "reject") => {
      if (!eventId || selectedIds.size === 0) return;
      const reason =
        decision === "reject"
          ? (window.prompt("Optional reject reason (shown in email):") ?? "")
          : "";
      setBulkBusy(true);
      try {
        const result = await bulkDecideRegistrationsAction({
          eventId,
          registrationIds: [...selectedIds],
          decision,
          reason,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success(
          `Approved ${result.data.approved}, rejected ${result.data.rejected}, skipped ${result.data.skipped}.`,
        );
        setSelectedIds(new Set());
      } finally {
        setBulkBusy(false);
      }
    },
    [eventId, selectedIds, toast],
  );

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
        joinCode: team?.joinCode ?? null,
      });
    });
  }, [attendees, filters, groups, teamLookup]);

  const handleQuickStatusChange = useCallback(
    async (reg: Registration, newStatus: "confirmed" | "rejected") => {
      if (newStatus === "confirmed") {
        const { approveDisabledReason } =
          await import("@/src/features/event_attendee/approveDisabledReason");
        const block = approveDisabledReason({
          isPaid: !isFree,
          status: reg.status,
          proofPath: reg.payment?.proofPath,
          paymentStatus: reg.payment?.paymentStatus,
        });
        if (block) {
          toast.error(block);
          return;
        }
      }
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
    [handle_reg_status, isFree, toast],
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
          const extras = {
            teamName: g.name,
            trackName: g.subtitle,
            accessCode: g.accessCode,
            joinCode: g.joinCode,
          };
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
          joinCode: team.joinCode,
        };
        const show = matching.length > 0 || teamMetaMatches(filters, extras);
        if (!show) return { id: team.id, name: team.name, members: [] as AttendeeClientSideProp[] };
        const leadReg = attendees.find((a) => a.register.registrationId === team.leadId)?.register;
        const showCodes = hackathonTeamCodesVisible(
          { payment: team.payment, feeStatus: team.feeStatus ?? null },
          leadReg,
        );
        return {
          id: team.id,
          name: team.name,
          subtitle: team.trackName,
          accessCode: showCodes ? team.accessCode : null,
          joinCode: showCodes ? team.joinCode : null,
          payment: team.payment,
          feeStatus: team.feeStatus ?? null,
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

  const drawerTeamPayload = useMemo(() => {
    if (!openTeamMeta) return null;
    const leadReg = attendees.find(
      (a) => a.register.registrationId === openTeamMeta.leadId,
    )?.register;
    const showCodes = hackathonTeamCodesVisible(
      {
        payment: openTeamMeta.payment,
        feeStatus: openTeamMeta.feeStatus ?? null,
        eliminated: openTeamMeta.eliminated,
      },
      leadReg,
    );
    return {
      ...openTeamMeta,
      accessCode: showCodes && !openTeamMeta.joinCodeRevoked ? openTeamMeta.accessCode : null,
      joinCode: showCodes && !openTeamMeta.joinCodeRevoked ? openTeamMeta.joinCode : null,
    };
  }, [attendees, openTeamMeta]);

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
            {registrationForm ? (
              <RegistrationFormDrawer>{registrationForm}</RegistrationFormDrawer>
            ) : null}
            {eventId && organizerId ? (
              <AttendeeEmailMenu
                connectionBanner={
                  <EmailConnectionRequiredBanner
                    show={emailConnectionMissing || resendTestMode}
                    organizerId={organizerId}
                  />
                }
              >
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
              </AttendeeEmailMenu>
            ) : null}
            {onExport ? <ExportButton run={onExport} label="Export" /> : null}
            {importPanel ? (
              canImport ? (
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={() => setImportOpen(true)}
                >
                  Import
                </button>
              ) : (
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  disabled
                  title={PAID_IMPORT_TOOLTIP}
                >
                  Import
                </button>
              )
            ) : null}
            {exportsHref ? (
              <Link
                href={exportsHref}
                className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted/50"
                title={
                  sheetsConnected
                    ? "Open Exports / Google Sheets"
                    : "Open Exports to connect Sheets"
                }
              >
                {sheetsConnected ? "Sheets" : "Exports"}
              </Link>
            ) : null}
          </div>
        </div>

        {importOpen && importPanel ? (
          <div className="mb-6 rounded-xl border border-line bg-paper p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">Import attendees</h3>
              <button
                type="button"
                className="text-xs text-ink-soft hover:text-ink"
                onClick={() => setImportOpen(false)}
              >
                Close
              </button>
            </div>
            {importPanel}
          </div>
        ) : null}

        {selectedIds.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-muted/40 px-4 py-3">
            <span className="text-sm text-ink">{selectedIds.size} selected</span>
            <button
              type="button"
              disabled={bulkBusy}
              className={buttonClass("primary", "sm")}
              onClick={() => void runBulk("approve")}
            >
              Bulk approve
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              className={buttonClass("destructive", "sm")}
              onClick={() => void runBulk("reject")}
            >
              Bulk reject
            </button>
            <button
              type="button"
              className="text-xs text-ink-soft hover:text-ink"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        ) : null}

        {eventId ? <CheckInLookupBar eventId={eventId} /> : null}

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
            isPaid={!isFree}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm">
            <div className="grid grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1fr)_auto_auto_auto] border-b border-line bg-muted/30 px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
              <div aria-hidden="true" />
              <div>Attendee</div>
              <div>Ticket</div>
              <div>Status</div>
              <div>Check-in</div>
              <div className="text-right">Action</div>
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
                  isPaid={!isFree}
                  competitionName={teamLookup.get(acs.register.registrationId)?.trackName || ""}
                  selected={selectedIds.has(acs.register.registrationId)}
                  onToggleSelect={toggleSelect}
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
              team={drawerTeamPayload!}
              eventEndsAtIso={eventEndsAtIso}
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
                joinCode: openGroup.joinCode ?? null,
                memberIds: openGroup.members.map((m) => m.register.registrationId),
                leadId: openGroup.members[0]?.register.registrationId,
                payment: openGroup.payment,
                feeStatus: openGroup.feeStatus ?? null,
                amount: openGroup.amount,
                currency: openGroup.currency,
                proofUrl: openGroup.proofUrl,
              }}
              eventEndsAtIso={eventEndsAtIso}
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
            organizerId={organizerId}
            competitionName={teamLookup.get(open_attendee.register.registrationId)?.trackName}
            questions={questions}
            hidePayment={isFree}
            eventEndsAtIso={eventEndsAtIso}
            checkInByNames={checkInByNames}
            teamCodes={(() => {
              const tm = teamLookup.get(open_attendee.register.registrationId);
              if (!tm?.leadId) return null;
              const leadReg = attendees.find(
                (a) => a.register.registrationId === tm.leadId,
              )?.register;
              if (!leadReg) return null;
              return {
                joinCode: tm.joinCode,
                accessCode: tm.accessCode,
                trackName: tm.trackName,
                feeStatus: tm.feeStatus ?? null,
                teamPayment: tm.payment ?? null,
                leadRegistration: leadReg,
              };
            })()}
          />
        </aside>
      ) : null}
    </div>
  );
}
