import { notFound, redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import {
  getCustomFormForOwner,
  listFormResponses,
} from "@/src/features/custom_forms/customForms.service";
import { FormResponsesClient } from "@/src/features/custom_forms/components/FormResponsesClient";
import PageHeader from "@/src/shared_components/ui/PageHeader";

export default async function OrganizerFormResponsesPage({
  params,
}: {
  params: Promise<{ organizer_id: string; formId: string }>;
}) {
  const { organizer_id, formId } = await params;
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(`/auth/signin?next=/organizer/${organizer_id}/forms/${formId}/responses`);
  }
  if (user.userId !== organizer_id) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) redirect("/access-denied");
  }

  const form = await getCustomFormForOwner(formId, organizer_id);
  if (!form) notFound();
  const responses = await listFormResponses(formId, organizer_id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={`${form.title} — Responses`}
        description={`${responses.length} response(s).`}
      />
      <FormResponsesClient ownerId={organizer_id} form={form} responses={responses} />
    </div>
  );
}
