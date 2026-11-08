import HackathonWorkspace from "@/src/features/hackathon/components/HackathonWorkspace";
import { HackathonTabGate } from "@/src/features/hackathon/components/HackathonTabGate";
import { DriveHealthBanner } from "@/src/features/files/components/DriveHealthBanner";

export default async function EventSubmissionsPage(props: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams: Promise<{ edit?: string; e?: string; ok?: string; tab?: string; track?: string }>;
}) {
  const { organizer_id, eventId } = await props.params;
  return (
    <HackathonTabGate organizerId={organizer_id} eventId={eventId}>
      <DriveHealthBanner
        organizerId={organizer_id}
        eventId={eventId}
        connectionsHref={`/organizer/${organizer_id}/connections`}
      />
      <HackathonWorkspace {...props} view="submissions" />
    </HackathonTabGate>
  );
}
