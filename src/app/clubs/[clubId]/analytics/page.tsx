import { redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { listClubModules } from "@/src/features/department/department.service";
import { countClubEvents, listClubRequests, listClubTeams, requireClubPresident } from "@/src/features/clubs/club.service";

export default async function ClubAnalyticsPage({ params }: { params: Promise<{ clubId: string }> }) {
    const { clubId } = await params;
    const { club, user } = await requireClubPresident(clubId);
    const modules = await listClubModules(club.id);
    if (!modules.includes("analytics_basic")) redirect(`/clubs/${club.id}`);
    const [events, teams, requests] = await Promise.all([
        countClubEvents(club.id, user.userId),
        listClubTeams(club.id),
        listClubRequests(club.id),
    ]);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <PageHeader title="Analytics" description={`Snapshot for ${club.name}.`} />
            <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile label="Events" value={`${events}`} />
                <MetricTile label="Teams" value={`${teams.length}`} />
                <MetricTile label="Members" value={`${teams.reduce((n, t) => n + t.memberCount, 0)}`} />
                <MetricTile label="Requests" value={`${requests.length}`} />
            </section>
        </div>
    );
}
