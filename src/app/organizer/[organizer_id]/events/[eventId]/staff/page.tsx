import { notFound, redirect } from "next/navigation";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import type { TeamWithMembers } from "@/src/features/teams/teamEngine.types";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { staffMayOpenTab } from "@/src/features/hackathon/staffEventAccess";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { eventIsHackathon, listTracks } from "@/src/features/hackathon/hackathon.service";
import { absoluteUrl } from "@/src/lib/appUrl";
import { saveEventStaffAssignmentsAction } from "@/src/features/teams/actions/teamEngine.action";
import { TeamsManager } from "@/src/features/teams/components/TeamsManager";
import { can } from "@/src/features/permissions/can";

export default async function EventStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams?: Promise<{ e?: string; ok?: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const sp = searchParams ? await searchParams : {};
  const overview = `/organizer/${organizer_id}/events/${eventId}`;

  const event = await assertOwnedEvent(eventId);
  if (!event) notFound();
  if (!(await staffMayOpenTab(eventId, "staff"))) redirect(overview);

  const current = await AuthService.getCurrentUser().catch(() => null);
  if (
    current &&
    !(await can(current, "teams:manage", { eventId, organizerId: event.organizerId })) &&
    String(event.organizerId) !== current.userId
  ) {
    redirect(overview);
  }

  const [basic, advanced] = await Promise.all([
    hasModuleAccess(event.organizerId, "teams_basic"),
    hasModuleAccess(event.organizerId, "teams_advanced_roles"),
  ]);
  if (!basic && !advanced) {
    return (
      <LockedModulePanel
        moduleKey="teams_basic"
        title="Teams is not on this plan"
        ctaHref={`/organizer/${organizer_id}/dashboard`}
      />
    );
  }

  const [libraryDocs, assigned, applyRoot, isHack] = await Promise.all([
    TeamEngineService.listOrganizerStaffTeams(event.organizerId),
    TeamEngineService.listEventStaffAssignments(eventId),
    absoluteUrl("/"),
    eventIsHackathon(event),
  ]);
  const library: TeamWithMembers[] = await TeamEngineService.getTeamsWithMembers(libraryDocs);
  const assignedIds = new Set(assigned.map((a) => a.teamId));
  const assignedTeams = library
    .filter((t) => assignedIds.has(t.id))
    .map((team) => {
      const subset = assigned.find((a) => a.teamId === team.id)?.memberIds ?? [];
      const members = subset.length
        ? team.members.filter((m) => subset.includes(m.id))
        : team.members;
      return { ...team, members };
    });

  const assignedTeamIds = assignedTeams.map((t) => t.id);
  const [positionsByTeam, applicantsByTeam, formsByTeam, tracks] = await Promise.all([
    advanced
      ? TeamEngineService.listPositionsForTeams(assignedTeamIds)
      : Promise.resolve(new Map()),
    advanced
      ? TeamEngineService.listApplicantsForTeams(assignedTeamIds)
      : Promise.resolve(new Map()),
    advanced
      ? TeamEngineService.listRecruitmentFormsForTeams(assignedTeamIds)
      : Promise.resolve(new Map()),
    isHack ? listTracks(eventId) : Promise.resolve([]),
  ]);
  const advancedDetails = advanced
    ? assignedTeams.map((team) => ({
        team,
        positions: positionsByTeam.get(team.id) ?? [],
        applicants: applicantsByTeam.get(team.id) ?? [],
        forms: formsByTeam.get(team.id) ?? [],
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Event team</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Ops team for this event — assign people from your Teams library, manage roles, recruit,
          and export.
        </p>
      </div>
      <FormFeedback error={sp.e} success={sp.ok} />
      <TeamsManager
        scope={{ kind: "event", eventId, organizerId: organizer_id }}
        currentUserId={current?.userId}
        teams={assignedTeams}
        library={library}
        assigned={assigned}
        assignAction={saveEventStaffAssignmentsAction}
        advanced={advanced}
        advancedDetails={advancedDetails}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        applyRoot={applyRoot.replace(/\/$/, "")}
        contextType="event_staff"
      />
    </div>
  );
}
