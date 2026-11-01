import { notFound, redirect } from "next/navigation";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";

/** Legacy URL → public token apply route. */
export default async function StaffApplyRedirectPage({
  params,
}: {
  params: Promise<{ eventId: string; formId: string }>;
}) {
  const { formId } = await params;
  const form = await TeamEngineService.getRecruitmentForm(formId);
  if (!form?.publicToken) notFound();
  redirect(`/apply/${form.publicToken}`);
}
