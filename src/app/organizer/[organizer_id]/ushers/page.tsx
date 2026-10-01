import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export default async function UshersPage({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;
  if (!(await hasModuleAccess(organizer_id, "ushers_ops"))) {
    return (
      <div className="px-4 py-8">
        <LockedModulePanel moduleKey="ushers_ops" />
      </div>
    );
  }
  return (
    <div className="px-4 py-8">
      <PageHeader title="Ushers / on-ground ops" description="Zone check-in and staff task boards reuse event staff teams." />
      <Card>
        <CardBody>
          <p className="text-sm text-ink-soft">Module unlocked. Use the event Staff tab for rosters; zone boards will extend that roster.</p>
        </CardBody>
      </Card>
    </div>
  );
}
