import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export default async function AiDesignerPage({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;
  if (!(await hasModuleAccess(organizer_id, "ai_designer"))) {
    return (
      <div className="px-4 py-8">
        <LockedModulePanel moduleKey="ai_designer" />
      </div>
    );
  }
  return (
    <div className="px-4 py-8">
      <PageHeader title="AI Designer" description="Generate banners, certificate layouts, and social posts. Image generation wiring comes next." />
      <Card>
        <CardBody>
          <p className="text-sm text-ink-soft">This paid module is unlocked for your account. Upload and generation endpoints will attach here without changing this layout.</p>
        </CardBody>
      </Card>
    </div>
  );
}
