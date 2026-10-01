import { redirect } from "next/navigation";
import { Input } from "@/components/ui/Input";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";
import { listClubModules } from "@/src/features/department/department.service";
import { addClubTeamMember, createClubTeam, updateClubTeamMember } from "@/src/features/clubs/actions/clubTeams.action";
import { listClubTeams, requireClubPresident } from "@/src/features/clubs/club.service";

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
    const teams = await listClubTeams(club.id);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <PageHeader
                title="Teams"
                description={
                    advanced
                        ? "Advanced roles: promote leads, remove members, and share a join code."
                        : "Basic teams: name, lead, member count, and member details."
                }
            />
            <FormFeedback error={e} success={ok} />

            <form action={createClubTeam} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-4">
                <input type="hidden" name="clubId" value={club.id} />
                <input type="hidden" name="returnTo" value={`/clubs/${club.id}/teams`} />
                <Input id="team-name" name="name" label="Team name" required wrapperClassName="min-w-56 flex-1" />
                <SubmitButton className={buttonClass()}>Create team</SubmitButton>
            </form>

            {teams.length === 0 ? <p className="text-sm text-ink-soft">No teams yet.</p> : null}

            {teams.map((team) => (
                <section key={team.id} className="space-y-4 rounded-xl border border-line bg-paper p-5">
                    <header className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <h2 className="font-display text-lg text-ink">{team.name}</h2>
                            <p className="text-xs text-ink-soft">
                                Lead: {team.leadName} · {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                                {advanced && team.joinCode ? ` · Join code ${team.joinCode}` : ""}
                            </p>
                        </div>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-2xs uppercase tracking-wider text-ink-soft">
                                <tr>
                                    <th className="py-2 pr-4">Name</th>
                                    <th className="py-2 pr-4">ID</th>
                                    <th className="py-2 pr-4">Email</th>
                                    <th className="py-2 pr-4">Number</th>
                                    <th className="py-2 pr-4">Designation</th>
                                    {advanced ? <th className="py-2">Actions</th> : null}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {team.people.map((p) => (
                                    <tr key={p.id}>
                                        <td className="py-2 pr-4 font-medium text-ink">
                                            {p.fullName}
                                            {p.isLead ? <span className="ml-1 text-2xs uppercase text-ink-faint">lead</span> : null}
                                        </td>
                                        <td className="py-2 pr-4 text-ink-soft">{p.memberCode || "—"}</td>
                                        <td className="py-2 pr-4 text-ink-soft">{p.email || "—"}</td>
                                        <td className="py-2 pr-4 text-ink-soft">{p.phone || "—"}</td>
                                        <td className="py-2 pr-4 text-ink-soft">{p.designation || "—"}</td>
                                        {advanced ? (
                                            <td className="py-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {!p.isLead ? (
                                                        <form action={updateClubTeamMember}>
                                                            <input type="hidden" name="clubId" value={club.id} />
                                                            <input type="hidden" name="personId" value={p.id} />
                                                            <input type="hidden" name="action" value="lead" />
                                                            <input type="hidden" name="returnTo" value={`/clubs/${club.id}/teams`} />
                                                            <SubmitButton className={buttonClass("secondary", "sm")}>Make lead</SubmitButton>
                                                        </form>
                                                    ) : null}
                                                    <form action={updateClubTeamMember}>
                                                        <input type="hidden" name="clubId" value={club.id} />
                                                        <input type="hidden" name="personId" value={p.id} />
                                                        <input type="hidden" name="action" value="remove" />
                                                        <input type="hidden" name="returnTo" value={`/clubs/${club.id}/teams`} />
                                                        <SubmitButton className={buttonClass("ghost", "sm")}>Remove</SubmitButton>
                                                    </form>
                                                </div>
                                            </td>
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <form action={addClubTeamMember} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
                        <input type="hidden" name="clubId" value={club.id} />
                        <input type="hidden" name="teamId" value={team.id} />
                        <input type="hidden" name="returnTo" value={`/clubs/${club.id}/teams`} />
                        <Input id={`${team.id}-name`} name="fullName" label="Name" required />
                        <Input id={`${team.id}-code`} name="memberCode" label="Member ID" />
                        <Input id={`${team.id}-email`} name="email" type="email" label="Email" />
                        <Input id={`${team.id}-phone`} name="phone" label="Number" />
                        <Input id={`${team.id}-role`} name="designation" label="Designation" />
                        {advanced ? (
                            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2 lg:col-span-1">
                                <input type="checkbox" name="isLead" />
                                Team lead
                            </label>
                        ) : null}
                        <div className="flex items-end">
                            <SubmitButton className={buttonClass("secondary")}>Add member</SubmitButton>
                        </div>
                    </form>
                </section>
            ))}
        </div>
    );
}
