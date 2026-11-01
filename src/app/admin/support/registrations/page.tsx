import { redirect } from "next/navigation";
import { requireAdminArea } from "@/src/features/admin/guard";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { RegistrationPiiViewer } from "@/src/features/admin/components/RegistrationPiiViewer";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationPiiPage() {
  const admin = await requireAdminArea("support");
  if (!admin) {
    redirect("/admin/signin?next=/admin/support/registrations");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registration support view"
        description="Reason-required access to registration personal data. Audited. No platform bulk export."
      />
      <RegistrationPiiViewer />
    </div>
  );
}
