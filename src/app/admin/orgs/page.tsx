import { OrgBoard } from "@/src/features/admin/components/OrgBoard";
import { getOrgListBundle } from "@/src/features/admin/orgList.service";
import { requireAdminArea } from "@/src/features/admin/guard";
import { redirect } from "next/navigation";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

export const metadata = {
  title: "Departments & clubs — Admin — Avoeline",
};

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const [{ e, ok }, bundle, admin] = await Promise.all([
    searchParams,
    getOrgListBundle(),
    requireAdminArea("orgs"),
  ]);

  if (!admin) redirect("/admin/signin?next=/admin/orgs");

  return (
    <div className="space-y-6">
      <FormFeedback error={e} success={ok} />
      <OrgBoard
        departments={bundle.departments}
        clubs={bundle.clubs}
        metrics={bundle.metrics}
        plans={bundle.plans}
        canDelete={Boolean(admin?.isOwner)}
      />
    </div>
  );
}
