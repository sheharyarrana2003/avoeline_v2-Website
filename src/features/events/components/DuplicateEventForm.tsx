import { Copy } from "lucide-react";
import { duplicateEvent } from "@/src/features/events/actions/duplicateEvent.action";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";

export function DuplicateEventForm({
  eventId,
  organizerId,
  title,
  returnTo,
  compact = false,
  menuItem = false,
}: {
  eventId: string;
  organizerId: string;
  title: string;
  returnTo: string;
  compact?: boolean;
  menuItem?: boolean;
}) {
  return (
    <form action={duplicateEvent}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <ConfirmSubmit
        tone="default"
        title={`Duplicate ${title}?`}
        description="Creates a draft copy of this event’s settings. Registrations and attendees are not copied."
        confirmLabel="Duplicate event"
        className={
          menuItem
            ? "block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            : compact
              ? buttonClass("ghost", "sm")
              : buttonClass("secondary", "sm")
        }
      >
        {menuItem ? (
          "Duplicate"
        ) : compact ? (
          <>
            <Copy size={16} aria-hidden="true" />
            <span className="sr-only">Duplicate {title}</span>
          </>
        ) : (
          "Duplicate event"
        )}
      </ConfirmSubmit>
    </form>
  );
}
