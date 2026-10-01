import { redirectHackathonToEvent } from "@/src/features/hackathon/redirectToEventDash";

export default async function Page({ params }: { params: Promise<{ organizer_id: string; eventId: string }> }) {
  const { organizer_id, eventId } = await params;
  redirectHackathonToEvent(organizer_id, eventId, "attendees");
}
