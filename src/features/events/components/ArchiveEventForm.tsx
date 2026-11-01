import { Archive, RotateCcw } from "lucide-react";
import { archiveEvent, restoreEvent } from "@/src/features/events/actions/archiveEvent.action";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";

export function ArchiveEventForm({
  eventId,
  organizerId,
  title,
  returnTo,
  archived,
  compact = false,
  menuItem = false,
}: {
  eventId: string;
  organizerId: string;
  title: string;
  returnTo: string;
  archived: boolean;
  compact?: boolean;
  menuItem?: boolean;
}) {
  if (archived) {
    return (
      <form action={restoreEvent}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="organizerId" value={organizerId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <ConfirmSubmit
          tone="default"
          title={`Restore ${title}?`}
          description="This puts the event back on your live list as published. Registration and public listing follow the event’s existing access settings."
          confirmLabel="Restore event"
          className={
            menuItem
              ? "block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              : compact
                ? buttonClass("ghost", "sm")
                : buttonClass("secondary", "sm")
          }
        >
          {menuItem ? (
            "Restore"
          ) : compact ? (
            <>
              <RotateCcw size={16} aria-hidden="true" />
              <span className="sr-only">Restore {title}</span>
            </>
          ) : (
            "Restore event"
          )}
        </ConfirmSubmit>
      </form>
    );
  }

  return (
    <form action={archiveEvent}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <ConfirmSubmit
        tone="default"
        title={`Archive ${title}?`}
        description="Archived events leave Upcoming and other live tabs. You can restore them later. Registrations and data stay intact."
        confirmLabel="Archive event"
        className={
          menuItem
            ? "block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            : compact
              ? buttonClass("ghost", "sm")
              : buttonClass("secondary", "sm")
        }
      >
        {menuItem ? (
          "Archive"
        ) : compact ? (
          <>
            <Archive size={16} aria-hidden="true" />
            <span className="sr-only">Archive {title}</span>
          </>
        ) : (
          "Archive event"
        )}
      </ConfirmSubmit>
    </form>
  );
}
