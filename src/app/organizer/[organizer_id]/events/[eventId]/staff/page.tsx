import { notFound, redirect } from "next/navigation";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import type { TeamWithMembers } from "@/src/features/teams/teamEngine.types";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { staffMayOpenTab } from "@/src/features/hackathon/staffEventAccess";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
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

  const [libraryDocs, assigned] = await Promise.all([
    TeamEngineService.listOrganizerStaffTeams(event.organizerId),
    TeamEngineService.listEventStaffAssignments(eventId),
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Event team</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Assign library teams and members for this event. Recruitment, grants, and roster edits
          live on Manage in Teams.
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
        advanced={false}
        contextType="event_staff"
        hideRecruitment
        hideChrome
      />
    </div>
  );
}
