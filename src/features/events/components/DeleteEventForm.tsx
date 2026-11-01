import { Trash2 } from "lucide-react";
import { deleteEvent } from "@/src/features/events/actions/deleteEvent.action";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import { deleteRequiresTitleConfirm } from "@/src/features/events/organizerEvents.filters";

export function DeleteEventForm({
  eventId,
  organizerId,
  title,
  returnTo,
  compact = false,
  registrationCount = 0,
  menuItem = false,
}: {
  eventId: string;
  organizerId: string;
  title: string;
  returnTo: string;
  compact?: boolean;
  /** Occupying registration count — title confirm when > 0. */
  registrationCount?: number;
  /** Render as a full-width menu row instead of an icon button. */
  menuItem?: boolean;
}) {
  const needPhrase = deleteRequiresTitleConfirm(registrationCount);
  return (
    <form action={deleteEvent}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <ConfirmSubmit
        tone="danger"
        title={`Delete ${title}?`}
        description={
          needPhrase
            ? `This event has ${registrationCount} registration${registrationCount === 1 ? "" : "s"}. Type the event title to confirm. This removes the event and related rows permanently.`
            : "This removes the event and related rows in the database: registrations, agenda, speakers, tickets, hackathon data, bookings, certificates, and reports. This cannot be undone."
        }
        confirmLabel="Delete event"
        confirmPhrase={needPhrase ? title : undefined}
        className={
          menuItem
            ? "block w-full px-3 py-2 text-left text-sm text-danger hover:bg-muted"
            : compact
              ? buttonClass("ghost", "sm")
              : buttonClass("destructive", "sm")
        }
      >
        {menuItem ? (
          "Delete"
        ) : compact ? (
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
