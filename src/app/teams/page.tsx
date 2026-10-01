import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Plus, Key, Shield, ArrowRight } from "lucide-react";
import { AuthService } from "@/src/features/auth/authService";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { TeamRosterView } from "@/src/features/teams/components/TeamRosterView";
import { buttonClass } from "@/src/lib/ui";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import type { TeamWithMembers } from "@/src/features/teams/teamEngine.types";

export const metadata = {
    title: "My Teams — Avoeline",
};

export default async function MyTeamsPage() {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) {
        redirect("/auth/signin?next=/teams");
    }

    // Strictly scoped to the logged-in user's enrolled teams
    const userTeams = await TeamEngineService.getUserTeams(user.userId);

    const teamsWithMembers: TeamWithMembers[] = await Promise.all(
        userTeams.map(async (t) => {
            const members = await TeamEngineService.getTeamMembers(t.id);
            return { ...t, members };
        })
    );

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
                <div>
                    <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary">
                        <Users className="h-4 w-4" />
                        <span>Team & Collaboration Workspace</span>
                    </div>
                    <h1 className="mt-1 font-display text-3xl font-bold text-ink">
                        My Teams & Rosters
                    </h1>
                    <p className="mt-1 text-sm text-ink-soft">
                        Teams you lead or participate in across hackathons, committees, and event rosters.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/teams/join" className={buttonClass("secondary", "md")}>
                        <Key className="h-4 w-4 mr-1.5" />
                        Join Team by Code
                    </Link>
                </div>
            </div>

            {teamsWithMembers.length === 0 ? (
                <div className="rounded-2xl border border-line bg-paper p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-ink-faint" />
                    <h3 className="mt-4 font-display text-base font-semibold text-ink">
                        You have not joined any teams yet
                    </h3>
                    <p className="mt-1 text-xs text-ink-soft max-w-sm mx-auto">
                        Ask your team lead or organizer for a 6-character team join code, or join from an event track page.
                    </p>
                    <Link
                        href="/teams/join"
                        className={buttonClass("primary", "sm", "mt-6 inline-flex")}
                    >
                        <Key className="h-4 w-4 mr-1.5" />
                        Enter Team Join Code
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {teamsWithMembers.map((team) => {
                        const myMembership = team.members.find((m) => m.userId === user.userId);
                        const isLead = myMembership?.role === "lead";

                        return (
                            <div
                                key={team.id}
                                className="rounded-2xl border border-line bg-paper p-6 shadow-xs space-y-6"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-display text-xl font-bold text-ink">
                                                {team.name}
                                            </h2>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold uppercase ${isLead ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-muted text-ink-soft"}`}>
                                                {isLead ? "Team Lead" : "Member"}
                                            </span>
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-medium text-primary">
                                                {team.contextType.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p className="text-xs text-ink-soft mt-1">
                                            {team.members.length} member{team.members.length === 1 ? "" : "s"} · Created {new Date(team.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-muted/30 px-3 py-1.5 text-xs">
                                            <span className="text-ink-soft">Join Code:</span>
                                            <span className="font-mono font-bold tracking-wider text-ink">
                                                {team.joinCode}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <TeamRosterView
                                    team={team}
                                    currentUserId={user.userId}
                                    isOrganizerOrAdmin={isLead}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
