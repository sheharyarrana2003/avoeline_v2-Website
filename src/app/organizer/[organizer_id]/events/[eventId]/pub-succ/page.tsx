import Link from "next/link";
import { Check } from "lucide-react";
import ShareRow from "@/src/features/events/components/wizard/results/components/ShareRow";
import { EventService } from "@/src/services/event.service";
import { formatDate } from "@/src/lib/datetime";
import { buttonClass } from "@/src/lib/ui";
import { absoluteUrl, registrationPath } from "@/src/lib/appUrl";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { AuthService } from "@/src/features/auth/authService";

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

  const current = await AuthService.getCurrentUser();
  const homeHref =
    current?.role === "department_admin"
      ? "/department"
      : current?.presidentOfOrgIds?.[0]
        ? `/clubs/${current.presidentOfOrgIds[0]}`
        : `/organizer/${organizer_id}/dashboard`;
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
        <MetricTile label="Capacity" value={`${event.capacity.totalSeats}`} />
        <MetricTile label="Date" value={formatDate(event.schedule.startDate)} />
      </section>

      <div className="mt-8 flex w-full flex-col gap-3">
        <Link href={base} className={buttonClass("primary", "lg", "w-full")}>
          View event
        </Link>
        <Link href={`${base}/attendees`} className={buttonClass("secondary", "lg", "w-full")}>
          Manage registrations
        </Link>
        <Link href={homeHref} className={buttonClass("ghost", "lg", "w-full")}>
          Go to dashboard
        </Link>
      </div>

      <div className="mt-8">
        {/* Built from the incoming request rather than a constant. This used to be
            hardcoded to avoeline.com, a host this app does not run on, so the link
            organizers were told to share resolved to nothing at all. */}
        <ShareRow eventUrl={await absoluteUrl(registrationPath(event.id))} eventTitle={event.title} />
      </div>
    </div>
  );
}
