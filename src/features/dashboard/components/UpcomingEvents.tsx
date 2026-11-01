import { DashboardEvent } from "@/src/features/dashboard/types";
import { formatDate } from "@/src/lib/datetime";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { Meter } from "@/src/shared_components/ui/charts/Meter";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

export default function UpcomingEvents({ events }: { events: DashboardEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<CalendarDays className="h-5 w-5" />}
        title="No upcoming events"
        description="Published events with a future start date will appear here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-xl border border-line bg-paper p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <EventThumb title={event.title} src={event.bannerUrl} size="sm" className="min-w-0" />
            <time className="shrink-0 text-xs text-ink-soft tabular-nums">
              {formatDate(event.startDate)}
            </time>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} size="sm" />
            {event.location && event.location !== "—" ? (
              <span className="flex min-w-0 items-center gap-1 text-xs text-ink-soft">
                <MapPin size={11} className="shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </span>
            ) : null}
          </div>

          <Meter
            label="Registered"
            value={event.registeredCount}
            max={event.maxCapacity}
            caption={`${event.registeredCount} of ${event.maxCapacity || "—"} seats`}
          />

          <div className="mt-3 flex justify-end">
            <Link
              href={`/organizer/${event.organizerId}/events/${event.id}`}
              className="text-xs font-medium text-accent-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Manage
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
