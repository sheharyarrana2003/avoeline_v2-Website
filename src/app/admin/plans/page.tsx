import { redirect } from "next/navigation";
import { requireAdminArea } from "@/src/features/admin/guard";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { getPlanCounts, listPlans } from "@/src/features/saas/saas.service";
import { PlansBoard } from "@/src/features/saas/components/PlansBoard";

export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<{ e?: string; ok?: string }> }) {
  const admin = await requireAdminArea("plans");
  if (!admin) redirect("/admin/signin?next=/admin/plans");

  const [{ e, ok }, plans, counts] = await Promise.all([searchParams, listPlans(), getPlanCounts()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Prices and the modules each plan unlocks. Organizer access follows these settings immediately."
      />
      <FormFeedback error={e} success={ok} />
      <PlansBoard plans={plans} counts={counts} />
    </div>
  );
}
