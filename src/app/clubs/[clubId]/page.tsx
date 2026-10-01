import Link from "next/link";
import { CalendarDays, Inbox, Users } from "lucide-react";
import { AuthService } from "@/src/features/auth/authService";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { Card, CardBody } from "@/components/ui/Card";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";
import { PlanStatusBanner } from "@/src/features/department/components/PlanStatusBanner";
import { getClubWorkspacePlan } from "@/src/features/department/department.service";
import {
    countClubEvents,
    isClubPresident,
    listClubRequests,
    listClubTeams,
    resolveClub,
} from "@/src/features/clubs/club.service";

export default async function ClubHomePage({
    params,
    searchParams,
}: {
    params: Promise<{ clubId: string }>;
    searchParams: Promise<{ e?: string; ok?: string }>;
}) {
    const { clubId } = await params;
    const { e, ok } = await searchParams;
    const [club, user] = await Promise.all([resolveClub(clubId), AuthService.getCurrentUser()]);
    const president = isClubPresident(user, club);

    if (!president || !user) {
        const { data: announcements } = await supabaseAdmin
            .from(TABLES.ORG_ANNOUNCEMENTS)
            .select("id, title, body")
            .eq("org_id", club.id)
            .order("created_at", { ascending: false })
            .limit(8);
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
                <PageHeader title={club.name} description="Student club" />
                {(announcements ?? []).length === 0 ? (
                    <p className="text-sm text-ink-soft">No public announcements yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {(announcements ?? []).map((a) => (
                            <li key={a.id} className="rounded-xl border border-line bg-paper p-4">
                                <p className="font-medium text-ink">{a.title}</p>
                                <p className="mt-1 text-sm text-ink-soft">{a.body}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        );
    }

    const [plan, events, teams, requests] = await Promise.all([
        getClubWorkspacePlan(club.id),
        countClubEvents(club.id, user.userId),
        listClubTeams(club.id),
        listClubRequests(club.id),
    ]);
    const pending = requests.filter((r) => r.status === "pending").length;

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <PageHeader
                title={club.name}
                description="Club workspace. Tabs on the left match features your department granted."
                actions={
                    <Link href={`/clubs/${club.id}/requests`} className={buttonClass()}>
                        New request
                    </Link>
                }
            />
            <FormFeedback error={e} success={ok} />
            <PlanStatusBanner plan={plan} audience="club" />
            <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-3 sm:divide-x sm:divide-line">
                <MetricTile label="Events" value={`${events}`} icon={<CalendarDays className="h-4 w-4" />} />
                <MetricTile label="Teams" value={`${teams.length}`} icon={<Users className="h-4 w-4" />} />
                <MetricTile label="Open requests" value={`${pending}`} icon={<Inbox className="h-4 w-4" />} />
            </section>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Recent requests">
                    <CardBody>
                        {requests.slice(0, 5).length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : null}
                        <ul className="divide-y divide-line text-sm">
                            {requests.slice(0, 5).map((r) => (
                                <li key={r.id} className="flex justify-between gap-2 py-2">
                                    <span>{r.title}</span>
                                    <span className="text-ink-soft">{r.status}</span>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
                <Card title="Teams">
                    <CardBody>
                        {teams.length === 0 ? <p className="text-sm text-ink-soft">Create a team from the Teams tab.</p> : null}
                        <ul className="divide-y divide-line text-sm">
                            {teams.slice(0, 5).map((t) => (
                                <li key={t.id} className="flex justify-between gap-2 py-2">
                                    <span>{t.name}</span>
                                    <span className="text-ink-soft">{t.memberCount} members</span>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
