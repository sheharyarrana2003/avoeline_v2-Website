import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { listCustomForms } from "@/src/features/custom_forms/customForms.service";
import { FormsListClient } from "@/src/features/custom_forms/components/FormsListClient";
import PageHeader from "@/src/shared_components/ui/PageHeader";

export default async function OrganizerFormsPage({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/auth/signin?next=/organizer/${organizer_id}/forms`);
  if (user.userId !== organizer_id) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) redirect("/access-denied");
  }

  const forms = await listCustomForms(organizer_id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Custom Forms"
        description="Reusable surveys, feedback forms, and checklists — separate from event registration and team recruitment."
      />
      <FormsListClient ownerId={organizer_id} initialForms={forms} />
    </div>
  );
}
