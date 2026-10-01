import { redirect } from "next/navigation";
import { EventService } from "@/src/services/event.service";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
/** Tickets tab removed; tiers live on Access (and the create wizard). */
export default async function EventTicketsRedirect({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const event = await EventService.getEventByID(eventId);
  if (event && (await eventIsHackathon(event))) {
    redirect(`/organizer/${organizer_id}/events/${eventId}/attendees`);
  }
  redirect(`/organizer/${organizer_id}/events/${eventId}/access`);
}
