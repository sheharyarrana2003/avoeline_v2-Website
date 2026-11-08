import { redirect } from "next/navigation";

/** Create flow moved to in-tab modal on the Agenda page (docs/22 O4). */
export default async function CreateAgendaRedirect({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const { organizer_id, eventId } = await params;
  redirect(`/organizer/${organizer_id}/events/${eventId}/agenda`);
}
