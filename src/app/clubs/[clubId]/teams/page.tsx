import { redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { TeamsManager } from "@/src/features/teams/components/TeamsManager";

export default async function ClubTeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const { clubId } = await params;
  const { e, ok } = await searchParams;
  const { club } = await requireClubPresident(clubId);
  const modules = await listClubModules(club.id);
  const allowed = modules.includes("teams_basic") || modules.includes("teams_advanced_roles");
  if (!allowed) redirect(`/clubs/${club.id}`);
  const advanced = modules.includes("teams_advanced_roles");

  const listed = await TeamEngineService.getTeamsByContext({
    contextType: "club_committee",
    orgId: club.id,
  });
  const teams = await TeamEngineService.getTeamsWithMembers(listed);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Teams"
        description={
          advanced
            ? "Club committees — recruit, grant access, and export."
            : "Basic club teams: create rosters and add members."
        }
      />
      <FormFeedback error={e} success={ok} />
      <TeamsManager
        scope={{ kind: "club", orgId: club.id }}
        teams={teams}
        advanced={advanced}
        contextType="club_committee"
      />
    </div>
  );
}
