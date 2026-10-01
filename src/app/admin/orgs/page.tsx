import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { OrgManagementView } from "@/src/features/teams/components/OrgManagementView";
import { listPlans } from "@/src/features/saas/saas.service";
import { requireAdminArea } from "@/src/features/admin/guard";
import { redirect } from "next/navigation";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

export const metadata = {
    title: "Organizations & Clubs — Admin — Avoeline",
};

export default async function AdminOrgsPage({
    searchParams,
}: {
    searchParams: Promise<{ e?: string; ok?: string }>;
}) {
    const [{ e, ok }, departments, clubs, plans, admin] = await Promise.all([
        searchParams,
        TeamEngineService.listOrgs("department"),
        TeamEngineService.listOrgs("club"),
        listPlans({ activeOnly: true }),
        requireAdminArea("orgs"),
    ]);

    if (!admin) redirect("/admin/signin?next=/admin/orgs");

    return (
        <div className="space-y-6">
            <p className="rounded-xl border border-line bg-muted px-4 py-3 text-sm text-ink-soft">
                <strong className="text-ink">What this page is.</strong> The university tree — departments and
                clubs. Edit name, parent, or plan here. Delete (owner only) removes the folder, child clubs, and
                those people from Supabase Auth. To create a login, use Tenant accounts.
            </p>
            <FormFeedback error={e} success={ok} />
            <OrgManagementView
                departments={departments}
                clubs={clubs}
                plans={plans.map((p) => ({ key: p.key, name: p.name }))}
                canDelete={Boolean(admin?.isOwner)}
            />
        </div>
    );
}
