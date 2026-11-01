import { notFound } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { OrganizerTeamsShell } from "@/src/features/teams/components/OrganizerTeamsShell";
import { parseOrganizerTeamsFilters } from "@/src/features/teams/organizerTeams.filters";
import type { TeamWithMembers } from "@/src/features/teams/teamEngine.types";

export default async function OrganizerTeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizer_id } = await params;
  const sp = searchParams ? await searchParams : {};
  const filters = parseOrganizerTeamsFilters(sp);

  const current = await AuthService.getCurrentUser().catch(() => null);
  if (!current?.userId) notFound();

  const [basic, advanced] = await Promise.all([
    hasModuleAccess(organizer_id, "teams_basic"),
    hasModuleAccess(organizer_id, "teams_advanced_roles"),
  ]);
  if (!basic && !advanced) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <LockedModulePanel
          moduleKey="teams_basic"
          title="Teams is not on this plan"
          description="Ask the SaaS owner to include Teams (basic) or Advanced team roles on your subscription."
          ctaHref={`/organizer/${organizer_id}/dashboard`}
        />
      </div>
    );
  }

  const [stats, listed] = await Promise.all([
    TeamEngineService.getOrganizerTeamsStats(organizer_id),
    TeamEngineService.listOrganizerStaffTeams(organizer_id),
  ]);
  const teamIds = listed.map((t) => t.id);

  const [
    teams,
    assignmentCountsMap,
    grants,
    positionsByTeam,
    applicantsByTeam,
    formsByTeam,
    eventRows,
  ] = await Promise.all([
    TeamEngineService.getTeamsWithMembers(listed),
    TeamEngineService.countEventAssignmentsForTeams(teamIds),
    advanced ? TeamEngineService.listOrganizerAccessGrants(organizer_id) : Promise.resolve([]),
    advanced ? TeamEngineService.listPositionsForTeams(teamIds) : Promise.resolve(new Map()),
    advanced ? TeamEngineService.listApplicantsForTeams(teamIds) : Promise.resolve(new Map()),
    advanced ? TeamEngineService.listRecruitmentFormsForTeams(teamIds) : Promise.resolve(new Map()),
    (async () => {
      const { supabaseAdmin } = await import("@/data/supabase");
      const { TABLES } = await import("@/data/collections");
      const { data } = await supabaseAdmin
        .from(TABLES.EVENTS)
        .select("id, title")
        .eq("organizer_id", organizer_id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []).map((e) => ({ id: String(e.id), title: String(e.title || "Event") }));
    })(),
  ]);

  const teamsTyped: TeamWithMembers[] = teams;
  const advancedDetails = advanced
    ? teamsTyped.map((team) => ({
        team,
        positions: positionsByTeam.get(team.id) ?? [],
        applicants: applicantsByTeam.get(team.id) ?? [],
        forms: formsByTeam.get(team.id) ?? [],
      }))
    : [];

  const forms = advancedDetails.flatMap((d) => d.forms);
  const applicants = advancedDetails.flatMap((d) => d.applicants);
  const assignmentCounts: Record<string, number> = {};
  for (const [id, n] of assignmentCountsMap) assignmentCounts[id] = n;

  const { absoluteUrl } = await import("@/src/lib/appUrl");
  const applyOrigin = (await absoluteUrl("/")).replace(/\/$/, "");

  return (
    <OrganizerTeamsShell
      organizerId={organizer_id}
      currentUserId={current.userId}
      currentUserName={current.name || ""}
      currentUserEmail={current.email || ""}
      advanced={advanced}
      filters={filters}
      stats={stats}
      teams={teamsTyped}
      assignmentCounts={assignmentCounts}
      grants={grants}
      forms={forms}
      applicants={applicants}
      events={eventRows}
      applyOrigin={applyOrigin}
      advancedDetails={advancedDetails}
    />
  );
}
