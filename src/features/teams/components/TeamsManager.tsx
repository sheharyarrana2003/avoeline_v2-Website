"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Plus, UserPlus, ClipboardList } from "lucide-react";
import type {
  TeamWithMembers,
  TeamMemberDoc,
  StaffApplicant,
  TeamPositionDoc,
  RecruitmentFormDoc,
} from "../teamEngine.types";
import { TeamCreator } from "./TeamCreator";
import { EventStaffAssignForm } from "./OrganizerTeamsBoard";
import { StaffRecruitmentSection } from "./StaffRecruitmentSection";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import { ExportTeamsModal } from "./ExportTeamsModal";
import { GrantInviteModal } from "./GrantInviteModal";
import { buttonClass } from "@/src/lib/ui";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

export type TeamsScope =
  | { kind: "organizer"; organizerId: string }
  | { kind: "event"; eventId: string; organizerId: string }
  | { kind: "club"; orgId: string; tenureId?: string }
  | { kind: "department"; orgId: string; clubId?: string }
  | { kind: "platform"; orgId: string };

export type TeamsManagerProps = {
  scope: TeamsScope;
  teams: TeamWithMembers[];
  advanced: boolean;
  currentUserId?: string;
  /** Event scope: full library for assign form */
  library?: TeamWithMembers[];
  assigned?: { teamId: string; memberIds: string[] }[];
  assignAction?: (formData: FormData) => void | Promise<void>;
  advancedDetails?: {
    team: TeamWithMembers;
    positions: TeamPositionDoc[];
    applicants: StaffApplicant[];
    forms: RecruitmentFormDoc[];
  }[];
  tracks?: { id: string; name: string }[];
  applyRoot?: string;
  contextType?: "event_staff" | "club_committee";
  /**
   * When true, omit header CTAs / bottom advanced lock — parent shell owns chrome
   * (organizer Teams tabbed page). Event `/staff` keeps default chrome.
   */
  hideChrome?: boolean;
  /** Controlled open for Add team panel when hideChrome is set. */
  showAddTeam?: boolean;
  onShowAddTeamChange?: (open: boolean) => void;
  /** Controlled open for export modal when hideChrome is set. */
  showExport?: boolean;
  onShowExportChange?: (open: boolean) => void;
};

function leadOf(team: TeamWithMembers): TeamMemberDoc | undefined {
  return team.members.find((m) => m.role === "lead") ?? team.members[0];
}

function memberLabel(m: TeamMemberDoc): string {
  return m.displayName || m.user?.name || m.email || "Member";
}

export function TeamsManager({
  scope,
  teams,
  advanced,
  currentUserId,
  library,
  assigned,
  assignAction,
  advancedDetails,
  tracks = [],
  applyRoot = "",
  contextType = "event_staff",
  hideChrome = false,
  showAddTeam: showAddTeamProp,
  onShowAddTeamChange,
  showExport: showExportProp,
  onShowExportChange,
}: TeamsManagerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drawer, setDrawer] = useState<{ team: TeamWithMembers; member: TeamMemberDoc } | null>(
    null,
  );
  const [showAddTeamLocal, setShowAddTeamLocal] = useState(false);
  const [showExportLocal, setShowExportLocal] = useState(false);
  const [showRecruit, setShowRecruit] = useState(false);
  const [showGrant, setShowGrant] = useState(false);

  const showAddTeam = showAddTeamProp ?? showAddTeamLocal;
  const setShowAddTeam = (open: boolean | ((v: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(showAddTeam) : open;
    onShowAddTeamChange?.(next);
    if (showAddTeamProp === undefined) setShowAddTeamLocal(next);
  };
  const showExport = showExportProp ?? showExportLocal;
  const setShowExport = (open: boolean | ((v: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(showExport) : open;
    onShowExportChange?.(next);
    if (showExportProp === undefined) setShowExportLocal(next);
  };

  const organizerId =
    scope.kind === "organizer" || scope.kind === "event" ? scope.organizerId : undefined;
  const eventId = scope.kind === "event" ? scope.eventId : undefined;
  const parentRef =
    scope.kind === "organizer"
      ? scope.organizerId
      : scope.kind === "club" || scope.kind === "department" || scope.kind === "platform"
        ? scope.orgId
        : organizerId || "";

  const positionsByMember = useMemo(() => {
    const map = new Map<string, TeamPositionDoc>();
    for (const detail of advancedDetails ?? []) {
      for (const p of detail.positions) map.set(p.id, p);
    }
    return map;
  }, [advancedDetails]);

  return (
    <div className="space-y-6">
      {!hideChrome ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            onClick={() => setShowAddTeam((v) => !v)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add team
          </button>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setShowAddTeam(true)}
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            Add member
          </button>
          {advanced ? (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setShowRecruit((v) => !v)}
            >
              <ClipboardList className="mr-1 h-3.5 w-3.5" />
              Recruitment
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setShowExport(true)}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Export
          </button>
          {advanced && organizerId ? (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setShowGrant(true)}
            >
              Grant access
            </button>
          ) : null}
        </div>
      ) : null}

      {showAddTeam ? (
        <div className="space-y-4 rounded-2xl border border-line bg-paper p-4">
          {scope.kind === "event" && library && assignAction ? (
            <EventStaffAssignForm
              eventId={scope.eventId}
              organizerId={scope.organizerId}
              library={library}
              assigned={assigned ?? []}
              action={assignAction}
            />
          ) : null}
          <TeamCreator
            contextType={contextType}
            parentRef={parentRef}
            organizerId={organizerId}
            title="Create a team"
            subtitle={
              scope.kind === "event"
                ? "Creates a library team and you can assign it above."
                : "Name the roster and add people."
            }
            allowJoinCodes={contextType === "club_committee"}
            extraMembers
          />
        </div>
      ) : null}

      {!teams.length ? (
        <EmptyState
          title={scope.kind === "event" ? "No event team yet" : "No teams yet"}
          description={
            scope.kind === "event"
              ? "Use Add team to assign a library roster to this event."
              : "Use Add team to create the first roster."
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
          {teams.map((team) => {
            const open = !!expanded[team.id];
            const lead = leadOf(team);
            return (
              <li key={team.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  onClick={() => setExpanded((s) => ({ ...s, [team.id]: !open }))}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{team.name}</p>
                    <p className="text-xs text-ink-soft">
                      {team.contextType.replace("_", " ")}
                      {lead ? ` · Lead ${memberLabel(lead)}` : ""}
                      {` · ${team.members.length} member${team.members.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </button>
                {open ? (
                  <ul className="space-y-1 border-t border-line bg-muted/20 px-4 py-3">
                    {team.members.map((m) => {
                      const pos = m.positionId ? positionsByMember.get(m.positionId) : undefined;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-paper"
                            onClick={() => setDrawer({ team, member: m })}
                          >
                            <span>
                              {memberLabel(m)}
                              {m.role === "lead" ? " · Lead" : ""}
                              {pos ? ` · ${pos.title}` : ""}
                            </span>
                            <span className="text-xs text-ink-soft">{m.source || "manual"}</span>
                          </button>
                        </li>
                      );
                    })}
                    {!team.members.length ? (
                      <li className="px-2 py-2 text-sm text-ink-soft">No members yet.</li>
                    ) : null}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {advanced && showRecruit && eventId && organizerId && advancedDetails ? (
        <StaffRecruitmentSection
          eventId={eventId}
          organizerId={organizerId}
          applyBase={applyRoot || ""}
          rosters={advancedDetails}
          tracks={tracks}
        />
      ) : null}

      {!hideChrome && !advanced && organizerId ? (
        <LockedModulePanel
          moduleKey="teams_advanced_roles"
          title="Paid plan: positions, recruitment, and access grants"
          description="Advanced team roles unlocks named positions, the recruitment pipeline, and permission grants. Activate it from your plan."
          ctaLabel="Plans"
          ctaHref={`/organizer/${organizerId}/dashboard`}
        />
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" role="dialog" aria-modal>
          <button
            type="button"
            className="flex-1"
            aria-label="Close"
            onClick={() => setDrawer(null)}
          />
          <aside className="h-full w-full max-w-md overflow-y-auto bg-paper p-6 shadow-xl">
            <h2 className="font-display text-2xl text-ink">{memberLabel(drawer.member)}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-ink-soft">Team</dt>
                <dd>{drawer.team.name}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Email</dt>
                <dd>{drawer.member.email || drawer.member.user?.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Role</dt>
                <dd>{drawer.member.role}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Position</dt>
                <dd>
                  {drawer.member.positionId
                    ? positionsByMember.get(drawer.member.positionId)?.title || "—"
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Joined</dt>
                <dd>
                  {drawer.member.joinedAt ? new Date(drawer.member.joinedAt).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Source</dt>
                <dd>{drawer.member.source || "manual"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Access</dt>
                <dd className="text-ink-soft">
                  {drawer.member.positionId
                    ? (positionsByMember.get(drawer.member.positionId)?.permissions || []).join(
                        ", ",
                      ) || "Position defaults"
                    : "No position permissions"}
                </dd>
              </div>
            </dl>
            {organizerId ? (
              <p className="mt-6 text-xs text-ink-soft">
                Edit roster details on{" "}
                <Link href={`/organizer/${organizerId}/teams`} className="underline">
                  Teams
                </Link>
                .
              </p>
            ) : null}
            <button
              type="button"
              className={`${buttonClass("secondary", "sm")} mt-4`}
              onClick={() => setDrawer(null)}
            >
              Close
            </button>
          </aside>
        </div>
      ) : null}

      {showExport ? (
        <ExportTeamsModal
          teams={teams}
          positionsByMember={positionsByMember}
          scope={scope}
          onClose={() => setShowExport(false)}
        />
      ) : null}

      {showGrant && organizerId ? (
        <GrantInviteModal
          organizerId={organizerId}
          eventId={eventId}
          onClose={() => setShowGrant(false)}
        />
      ) : null}

      {/* keep currentUserId referenced for future roster edit hooks */}
      {currentUserId ? null : null}
    </div>
  );
}
