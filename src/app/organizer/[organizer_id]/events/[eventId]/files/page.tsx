import { notFound, redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { EntityFilesPanel } from "@/src/features/connections/components/EntityFilesPanel";
import { staffMayOpenTab } from "@/src/features/hackathon/staffEventAccess";

export default async function EventFilesPage({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/signin?next=/organizer/${organizer_id}/events/${eventId}/files`);

  const owned = await assertOwnedEvent(eventId);
  const mayStaff = await staffMayOpenTab(eventId, "files");
  if (!owned && !mayStaff) notFound();

  return (
    <div className="mx-auto max-w-3xl py-6">
      <EntityFilesPanel
        ownerType="user"
        ownerId={organizer_id}
        entityType="event"
        entityId={eventId}
        connectionsHrefOwnerId={organizer_id}
      />
    </div>
  );
}
