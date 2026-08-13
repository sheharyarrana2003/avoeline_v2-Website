import Link from "next/link";
import { Check } from "lucide-react";
import ShareRow from "@/src/features/events/components/wizard/results/components/ShareRow";
import { EventService } from "@/src/services/event.service";
import { formatDate } from "@/src/lib/datetime";
import { buttonClass } from "@/src/lib/ui";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";

export default async function PublishSuccessPage({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
  const { organizer_id, eventId } = await params;
  const event = await EventService.getEventByID(eventId);

  if (!event) {
    return <p className="text-sm text-ink-soft">Event not found.</p>;
  }

  const message =
    event.status === "draft"
      ? "is saved as a draft."
      : event.status === "published"
        ? "is now live and open for registrations."
        : "is being added to your events.";

  const base = `/organizer/${organizer_id}/events/${eventId}`;

  return (
    // No modal chrome, no <h1> and no page padding: this renders inside the event
    // layout, which already shows the event's name, status and tabs. The old
    // "Event Published Successfully!" <h1> was the second one on the screen.
    <div className="mx-auto flex max-w-lg flex-col items-center text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-ink text-ink-invert" aria-hidden="true">
        <Check className="h-8 w-8" strokeWidth={3} />
      </span>

      <h2 className="font-display text-2xl text-ink">Event published</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {event.title} {message}
      </p>

      <section className="mt-8 grid w-full grid-cols-2 gap-y-8 border-y border-line py-8 text-left sm:divide-x sm:divide-line">
        <StatCard_dashboard title="Capacity" value={`${event.capacity.totalSeats}`} />
        <StatCard_dashboard title="Date" value={formatDate(event.schedule.startDate)} />
      </section>

      <div className="mt-8 flex w-full flex-col gap-3">
        <Link href={base} className={buttonClass("primary", "lg", "w-full")}>
          View event
        </Link>
        <Link href={`${base}/attendees`} className={buttonClass("secondary", "lg", "w-full")}>
          Manage registrations
        </Link>
        <Link href={`/organizer/${organizer_id}/dashboard`} className={buttonClass("ghost", "lg", "w-full")}>
          Go to dashboard
        </Link>
      </div>

      <div className="mt-8">
        <ShareRow eventUrl={`https://avoeline.com/events/${event.id}`} eventTitle={event.title} />
      </div>
    </div>
  );
}
