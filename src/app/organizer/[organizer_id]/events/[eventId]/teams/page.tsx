import { redirect } from "next/navigation";

/**
 * Phase B: competitor occupancy moved to Attendees — this URL stays valid for bookmarks.
 */
export default async function EventHackathonTeamsRedirectPage({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const { organizer_id, eventId } = await params;
  redirect(`/organizer/${organizer_id}/events/${eventId}/attendees`);
}
