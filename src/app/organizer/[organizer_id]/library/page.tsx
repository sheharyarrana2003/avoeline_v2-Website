import { redirect } from "next/navigation";

/** Library lives under Connections hub → Library. */
export default async function OrganizerLibraryPage({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;
  redirect(`/organizer/${organizer_id}/settings/connections?section=drive`);
}
