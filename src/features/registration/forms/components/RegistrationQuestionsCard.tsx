import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { listAllFields } from "../formFields.service";
import { EventFormFieldsEditor } from "./EventFormFieldsEditor";
import { EventService } from "@/src/services/event.service";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";

export async function RegistrationQuestionsCard({ eventId }: { eventId: string }) {
  const [event, fields] = await Promise.all([
    EventService.getEventByID(eventId),
    listAllFields(eventId),
  ]);
  if (!event) return null;

  const active = fields.filter((f) => !f.archivedAt);
  const isPaid = !event.pricing?.isFree;
  const hackathon = await eventIsHackathon(event);

  return (
    <Card title="Registration questions">
      <CardBody>
        <EventFormFieldsEditor
          mode="live"
          eventId={eventId}
          initialFields={active}
          groupRegistration={!!event.registration?.groupRegistration}
          groupMinSize={event.registration?.groupMinSize ?? 2}
          groupMaxSize={event.registration?.groupMaxSize ?? 8}
          isPaid={isPaid}
          hideGroupToggle={hackathon}
        />
      </CardBody>
    </Card>
  );
}
