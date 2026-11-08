import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { listAllFields } from "../formFields.service";
import { EventFormFieldsEditor } from "./EventFormFieldsEditor";
import { EventService } from "@/src/services/event.service";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";

export async function RegistrationQuestionsCard({
  eventId,
  bare = false,
}: {
  eventId: string;
  /** When true, render only the editor (parent supplies the Card chrome). */
  bare?: boolean;
}) {
  const [event, fields] = await Promise.all([
    EventService.getEventByID(eventId),
    listAllFields(eventId),
  ]);
  if (!event) return null;

  const active = fields.filter((f) => !f.archivedAt);
  const isPaid = !event.pricing?.isFree;
  const hackathon = await eventIsHackathon(event);

  const editor = (
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
  );

  if (bare) {
    return <div className="p-5">{editor}</div>;
  }

  return (
    <Card title="Registration questions">
      <CardBody>{editor}</CardBody>
    </Card>
  );
}
