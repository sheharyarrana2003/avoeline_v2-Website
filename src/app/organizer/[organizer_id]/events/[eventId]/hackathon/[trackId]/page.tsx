import { redirect } from "next/navigation";
import { hackathonTrackManagePath } from "@/src/features/hackathon/kinds";

export default async function LegacyHackathonTrackRedirect({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string; trackId: string }>;
}) {
  const { organizer_id, eventId, trackId } = await params;
  redirect(hackathonTrackManagePath(organizer_id, eventId, trackId));
}
