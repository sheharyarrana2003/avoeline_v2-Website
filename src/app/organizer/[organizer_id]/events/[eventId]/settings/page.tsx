import HackathonWorkspace from "@/src/features/hackathon/components/HackathonWorkspace";
import { HackathonTabGate } from "@/src/features/hackathon/components/HackathonTabGate";

export default async function EventHackathonSettingsPage(props: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams: Promise<{ edit?: string; e?: string; ok?: string; tab?: string; track?: string }>;
}) {
  const { organizer_id, eventId } = await props.params;
  return (
    <HackathonTabGate organizerId={organizer_id} eventId={eventId}>
      <HackathonWorkspace {...props} view="settings" />
    </HackathonTabGate>
  );
}
