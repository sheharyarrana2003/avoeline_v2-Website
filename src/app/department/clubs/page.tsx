import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { PlanStatusBanner } from "@/src/features/department/components/PlanStatusBanner";
import { ClubsWorkspace } from "@/src/features/department/components/ClubsWorkspace";
import {
  getDepartmentPlan,
  listClubOverviews,
  moduleOptions,
  resolveDepartment,
} from "@/src/features/department/department.service";

export const metadata = { title: "Clubs — Department — Avoeline" };

export default async function DepartmentClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; e?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const { department } = await resolveDepartment(sp.orgId);
  const [plan, clubs] = await Promise.all([
    getDepartmentPlan(department.id),
    listClubOverviews(department.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Clubs"
        description="Invite presidents by email link (never a password). Grant modules and manage tenures from the buttons below."
      />
      <FormFeedback error={sp.e} success={sp.ok} />
      <PlanStatusBanner plan={plan} audience="department" />
      <ClubsWorkspace
        departmentId={department.id}
        clubs={clubs}
        moduleOptions={moduleOptions(plan)}
      />
    </div>
  );
}
