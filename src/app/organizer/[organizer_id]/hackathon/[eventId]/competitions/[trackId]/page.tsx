import { redirectHackathonToEvent } from "@/src/features/hackathon/redirectToEventDash";

export default async function Page({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string; trackId: string }>;
}) {
  const { organizer_id, eventId, trackId } = await params;
  redirectHackathonToEvent(organizer_id, eventId, `competitions/${trackId}`);
}
