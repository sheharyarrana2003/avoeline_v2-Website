"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import {
  ACCESS_STATUS_LABEL,
  accessStatusForMember,
  countActiveAccessForTeam,
  initialFromName,
  leadOf,
  memberDisplayName,
  memberEmail,
  teamStatusLabel,
} from "../organizerTeams.helpers";
import type {
  OrganizerAccessGrantSummary,
  TeamPositionDoc,
  TeamWithMembers,
} from "../teamEngine.types";
import type { OrganizerTeamsFilters } from "../organizerTeams.filters";
import { TeamDetailDrawer } from "./TeamDetailDrawer";

function matchesFilters(
  team: TeamWithMembers,
  filters: OrganizerTeamsFilters,
  grants: OrganizerAccessGrantSummary[],
): boolean {
  if (filters.team && team.id !== filters.team) return false;
  const q = filters.q.trim().toLowerCase();
  if (q) {
    const hay = [
      team.name,
      ...team.members.flatMap((m) => [memberDisplayName(m), memberEmail(m), m.phone || ""]),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.role !== "all") {
    const wantLead = filters.role === "lead";
    const hasRole = team.members.some((m) => (wantLead ? m.role === "lead" : m.role === "member"));
    if (!hasRole) return false;
  }
  if (filters.access !== "all") {
    const any = team.members.some((m) => accessStatusForMember(m, grants) === filters.access);
    if (!any) return false;
  }
  return true;
}

export function OrganizerTeamsTab({
  organizerId,
  advanced,
  filters,
  teams,
  assignmentCounts,
  grants,
  positionsByTeam,
  onRequestAddMember,
}: {
  organizerId: string;
  advanced: boolean;
  filters: OrganizerTeamsFilters;
  teams: TeamWithMembers[];
  assignmentCounts: Record<string, number>;
  grants: OrganizerAccessGrantSummary[];
  positionsByTeam: Map<string, TeamPositionDoc[]>;
  onRequestAddMember: (teamId?: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => teams.filter((t) => matchesFilters(t, filters, grants)),
    [teams, filters, grants],
  );

  const selected = selectedId ? (teams.find((t) => t.id === selectedId) ?? null) : null;

  if (!teams.length) {
    return (
      <EmptyState
        title="No teams yet"
        description="Use Add team to create the first roster for your events."
      />
    );
  }

  if (!filtered.length) {
    return <EmptyState title="No teams match" description="Try clearing search or filters." />;
  }

  return (
    <>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
        {filtered.map((team) => {
          const lead = leadOf(team);
          const leadName = lead ? memberDisplayName(lead) : "—";
          const leadContact = lead ? memberEmail(lead) || lead.phone || "—" : "—";
          const events = assignmentCounts[team.id] ?? 0;
          const access = countActiveAccessForTeam(team, grants);
          const leadAccess = lead ? accessStatusForMember(lead, grants) : "none";

          return (
            <li key={team.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-muted/40 sm:flex-row sm:items-center"
                onClick={() => setSelectedId(team.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{team.name}</p>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-medium text-ink-soft">
                      {teamStatusLabel(team)}
                    </span>
                  </div>
                  {lead ? (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xs font-semibold text-ink">
                        {initialFromName(leadName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">Lead · {leadName}</p>
                        <p className="truncate text-xs text-ink-soft">{leadContact}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-ink-soft">No lead yet</p>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-4 text-center sm:w-72 sm:shrink-0">
                  <div>
                    <dt className="text-2xs uppercase text-ink-soft">Members</dt>
                    <dd className="text-sm font-medium text-ink">{team.members.length}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase text-ink-soft">Events</dt>
                    <dd className="text-sm font-medium text-ink">{events}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase text-ink-soft">Access</dt>
                    <dd
                      className="text-sm font-medium text-ink"
                      title={ACCESS_STATUS_LABEL[leadAccess]}
                    >
                      {access}
                    </dd>
                  </div>
                </dl>
              </button>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <TeamDetailDrawer
          team={selected}
          organizerId={organizerId}
          advanced={advanced}
          assignmentCount={assignmentCounts[selected.id] ?? 0}
          grants={grants}
          positions={positionsByTeam.get(selected.id) ?? []}
          onClose={() => setSelectedId(null)}
          onAddMember={(teamId) => {
            setSelectedId(null);
            onRequestAddMember(teamId);
          }}
        />
      ) : null}
    </>
  );
}
