import { Trash2 } from "lucide-react";
import { deleteEvent } from "@/src/features/events/actions/deleteEvent.action";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";

export function DeleteEventForm({
  eventId,
  organizerId,
  title,
  returnTo,
  compact = false,
}: {
  eventId: string;
  organizerId: string;
  title: string;
  returnTo: string;
  compact?: boolean;
}) {
  return (
    <form action={deleteEvent}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <ConfirmSubmit
        tone="danger"
        title={`Delete ${title}?`}
        description="This removes the event and related rows in the database: registrations, agenda, speakers, tickets, hackathon data, bookings, certificates, and reports. This cannot be undone."
        confirmLabel="Delete event"
        className={compact ? buttonClass("ghost", "sm") : buttonClass("destructive", "sm")}
      >
        {compact ? (
          <>
            <Trash2 size={16} aria-hidden="true" />
            <span className="sr-only">Delete {title}</span>
          </>
        ) : (
          "Delete event"
        )}
      </ConfirmSubmit>
    </form>
  );
}
