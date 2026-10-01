import { HackathonTabGate } from "@/src/features/hackathon/components/HackathonTabGate";
import HackathonTrackManagePage from "@/src/features/hackathon/components/HackathonTrackManagePage";

export default async function EventTrackManagePage(props: {
  params: Promise<{ organizer_id: string; eventId: string; trackId: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { organizer_id, eventId } = await props.params;
  return (
    <HackathonTabGate organizerId={organizer_id} eventId={eventId}>
      <HackathonTrackManagePage {...props} />
    </HackathonTabGate>
  );
}
