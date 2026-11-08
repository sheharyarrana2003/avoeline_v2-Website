import { redirect } from "next/navigation";

/** Phase B: public spectator leaderboard removed — use organizer scoreboard. */
export default async function SpectatorLeaderboardRedirectPage({
  params,
}: {
  params: Promise<{ eventId: string; trackId: string }>;
}) {
  const { eventId, trackId } = await params;
  redirect(`/events/${eventId}/tracks/${trackId}`);
}
