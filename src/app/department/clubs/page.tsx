import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";
import { Building2 } from "lucide-react";
import { MODULE_LABELS } from "@/src/features/permissions/moduleKeys";
import { createClubAccount } from "@/src/features/teams/actions/department.action";
import { setClubModuleAccess, createTenure } from "@/src/features/department/actions/departmentOrg.action";
import {
    getDepartmentPlan,
    listClubOverviews,
    moduleOptions,
    resolveDepartment,
    type ClubOverview,
} from "@/src/features/department/department.service";
import { PlanStatusBanner } from "@/src/features/department/components/PlanStatusBanner";

export const metadata = { title: "Clubs — Department — Avoeline" };

export default async function DepartmentClubsPage({
    searchParams,
}: {
    searchParams: Promise<{ orgId?: string; e?: string; ok?: string }>;
}) {
    const sp = await searchParams;
    const { department } = await resolveDepartment(sp.orgId);
    const [plan, clubs] = await Promise.all([getDepartmentPlan(department.id), listClubOverviews(department.id)]);
    const options = moduleOptions(plan);
    const returnTo = "/department/clubs";

    const columns: Column<ClubOverview>[] = [
        {
            key: "club",
            header: "Club",
            cell: (row) => (
                <CellStack
                    primary={
                        <Link href={`/department/clubs/${row.id}`} className="font-medium text-ink hover:underline">
                            {row.name}
                        </Link>
                    }
                    secondary={row.presidentEmail || "no president login"}
                />
            ),
        },
        { key: "events", header: "Events", align: "right", cell: (row) => `${row.eventCount}` },
        { key: "teams", header: "Teams", align: "right", cell: (row) => `${row.teamCount}` },
        {
            key: "features",
            header: "Features",
            cell: (row) => (
                <span className="text-xs text-ink-soft">
                    {row.modules.length ? row.modules.map((k) => MODULE_LABELS[k]).join(", ") : "none granted"}
                </span>
            ),
        },
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-10">
            <PageHeader
                title="Clubs"
                description="Create a club and a president login. Grant only features from this department's plan. Oversight is read-only."
            />
            <FormFeedback error={sp.e} success={sp.ok} />
            <PlanStatusBanner plan={plan} audience="department" />

            <section className="rounded-xl border border-line bg-paper p-5">
                <h2 className="font-display text-lg">Add club + president</h2>
                <p className="mt-1 text-xs text-ink-soft">
                    Creates a Supabase Auth user. They change the password on first sign-in, same as a tenant.
                </p>
                <form action={createClubAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="departmentId" value={department.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Input name="name" label="Club name" required />
                    <Input name="presidentName" label="President name" required />
                    <Input name="email" type="email" label="President email" required />
                    <Input name="password" type="password" label="Temporary password" helperText="At least 8 characters if email is not configured." />
                    <fieldset className="sm:col-span-2 space-y-2">
                        <legend className="text-xs font-medium text-ink">Features from your plan</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {options.map((o) => (
                                <label key={o.value} className="flex items-center gap-2 text-sm text-ink">
                                    <input type="checkbox" name="modules" value={o.value} defaultChecked={o.value === "events_dashboard"} />
                                    {o.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div>
                        <SubmitButton className={buttonClass()}>Create club and login</SubmitButton>
                    </div>
                </form>
            </section>

            <section className="rounded-xl border border-line bg-paper p-5 space-y-3">
                <h2 className="font-display text-lg">Grant or revoke features</h2>
                <form action={setClubModuleAccess} className="space-y-3">
                    <input type="hidden" name="departmentId" value={department.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <label className="block text-xs font-medium text-ink">
                        Club
                        <select name="orgId" className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm">
                            <option value="">Select a club…</option>
                            {clubs.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="applyAll" />
                        Apply to every club in this department
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {options.map((o) => (
                            <label key={o.value} className="flex items-center gap-2 text-sm text-ink">
                                <input type="checkbox" name="modules" value={o.value} />
                                {o.label}
                            </label>
                        ))}
                    </div>
                    <SubmitButton className={buttonClass("secondary")}>Save access</SubmitButton>
                </form>
            </section>

            <DataTable
                caption={`${clubs.length} club${clubs.length === 1 ? "" : "s"}`}
                rows={clubs}
                columns={columns}
                getKey={(r) => r.id}
                empty={
                    <EmptyState
                        size="sm"
                        icon={<Building2 className="h-5 w-5" />}
                        title="No clubs yet"
                        description="Create a club and president login above."
                    />
                }
            />

            <section className="rounded-xl border border-line bg-paper p-5">
                <h2 className="font-display text-lg">Tenure</h2>
                <form action={createTenure} className="mt-3 grid gap-3 sm:grid-cols-4">
                    <input type="hidden" name="orgId" value={department.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Input name="label" label="Label" required />
                    <Input name="startDate" type="date" label="Start" required />
                    <Input name="endDate" type="date" label="End" required />
                    <div className="flex items-end gap-2">
                        <label className="pb-2.5 text-xs">
                            <input type="checkbox" name="isCurrent" /> current
                        </label>
                        <SubmitButton className={buttonClass("secondary", "sm")}>Add</SubmitButton>
                    </div>
                </form>
            </section>
        </div>
    );
}
