import { redirect } from "next/navigation";

/** Batches live under Connections hub → Sent email. */
export default async function OrganizerEmailBatchesPage({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;
  redirect(`/organizer/${organizer_id}/settings/connections?tab=email`);
}
