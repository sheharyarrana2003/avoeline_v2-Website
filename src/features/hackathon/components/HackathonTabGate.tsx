import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
import { EventService } from "@/src/services/event.service";
import { notFound } from "next/navigation";

export async function HackathonTabGate({
  organizerId,
  eventId,
  children,
}: {
  organizerId: string;
  eventId: string;
  children: React.ReactNode;
}) {
  const event = await EventService.getEventByID(eventId);
  if (!event || !(await eventIsHackathon(event))) notFound();
  if (!(await hasModuleAccess(organizerId, "hackathon_ops"))) {
    return <LockedModulePanel moduleKey="hackathon_ops" />;
  }
  return children;
}
