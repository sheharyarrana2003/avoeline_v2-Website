import { notFound, redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { ClubDetailView } from "@/src/features/teams/components/ClubDetailView";
import type { TeamWithMembers } from "@/src/features/teams/teamEngine.types";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { AdminDeleteForm, AdminEditNameForm } from "@/src/features/admin/components/AdminCrudForms";
import { deleteOrg, updateOrg } from "@/src/features/admin/actions/tenancy.action";
import { listPlans } from "@/src/features/saas/saas.service";

export default async function AdminOrgDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ orgId: string }>;
    searchParams: Promise<{ e?: string; ok?: string }>;
}) {
    const [{ orgId }, { e, ok }] = await Promise.all([params, searchParams]);

    const org = await TeamEngineService.getOrg(orgId);
    if (!org) notFound();

    const [current, admin, plans, departments] = await Promise.all([
        AuthService.getCurrentUser().catch(() => null),
        AuthService.requireAdmin("orgs"),
        listPlans({ activeOnly: true }),
        TeamEngineService.listOrgs("department"),
    ]);

    if (!admin) redirect("/admin/signin?next=/admin/orgs");

    const department = org.parentOrgId
        ? await TeamEngineService.getOrg(org.parentOrgId)
        : null;

    // Fetch committees for this club/org
    const committees = await TeamEngineService.getTeamsByContext({
        contextType: "club_committee",
        orgId: org.id,
    });

    const committeesWithMembers: TeamWithMembers[] = await Promise.all(
        committees.map(async (c) => {
            const members = await TeamEngineService.getTeamMembers(c.id);
            return { ...c, members };
        })
    );

    const isOwnerOrAdmin = Boolean(
        current?.userId && (current.userId === org.ownerUid || current.userType === "admin")
    );

    return (
        <div className="space-y-6">
            <FormFeedback error={e} success={ok} />
            <AdminEditNameForm
                action={updateOrg}
                hidden={{
                    orgId: org.id,
                    returnTo: `/admin/orgs/${org.id}`,
                    ...(org.type === "club" ? {} : {}),
                }}
                name={org.name}
                nameLabel="Name"
                extra={
                    <>
                        {org.type === "club" ? (
                            <label className="block text-xs font-medium text-ink">
                                Parent department
                                <select
                                    name="parentOrgId"
                                    defaultValue={org.parentOrgId || ""}
                                    required
                                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
                                >
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                        {org.ownerUid ? (
                            <label className="block text-xs font-medium text-ink">
                                Plan
                                <select
                                    name="planKey"
                                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
                                >
                                    <option value="">Keep current</option>
                                    {plans.map((p) => (
                                        <option key={p.key} value={p.key}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                    </>
                }
            />
            {admin?.isOwner ? (
                <AdminDeleteForm
                    action={deleteOrg}
                    hidden={{ orgId: org.id }}
                    label={`Delete ${org.type}`}
                    title={`Delete ${org.name}?`}
                    description="Removes this folder, child clubs if it is a department, and those logins from Supabase Auth."
                />
            ) : null}
            <ClubDetailView
                club={org}
                department={department}
                committees={committeesWithMembers}
                currentUserId={current?.userId}
                isOwnerOrAdmin={isOwnerOrAdmin}
                backHref="/admin/orgs"
            />
        </div>
    );
}
