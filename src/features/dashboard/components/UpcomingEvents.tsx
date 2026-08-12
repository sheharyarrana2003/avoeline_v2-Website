import { DashboardEvent } from "@/src/features/dashboard/types";
import { formatDate } from "@/src/lib/datetime";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { CalendarDays } from "lucide-react";

export default function UpcomingEvents({ events }: { events: DashboardEvent[] }) {
  return (
    // Uncarded, like its two siblings: a grey card on a grey canvas separates from
    // nothing, and three widgets on one screen have to agree.
    <section className="font-sans">
      <h2 className="mb-5 border-b border-line pb-3 font-display text-xl text-ink">
        Upcoming events
      </h2>

      {events.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<CalendarDays className="h-5 w-5" />}
          title="No upcoming events"
          description="Published events with a future start date will appear here."
        />
      ) : (
        <ul className="space-y-5">
          {events.map((event) => {
            const percent = Math.min(100, Math.round((event.registeredCount / event.maxCapacity) * 100));

            return (
              <li key={event.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="line-clamp-1 text-sm text-ink">{event.title}</h3>
                  <time className="shrink-0 text-xs text-ink-soft tabular-nums">
                    {formatDate(event.startDate)}
                  </time>
                </div>

                {/* The fill is the only thing carrying the proportion visually, so the
                    count below it states the same fact in words. */}
                <div className="h-1 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-ink-soft tabular-nums">
                    {event.registeredCount} / {event.maxCapacity} registered
                  </p>
                  <a
                    href={`/organizer/events/${event.id}`}
                    className="text-xs font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Manage
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
