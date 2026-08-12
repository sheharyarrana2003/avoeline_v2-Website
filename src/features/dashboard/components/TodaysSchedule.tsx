import { DashboardEvent } from "../types";
import { Clock, MapPin, CalendarClock } from "lucide-react";
import { formatTime } from "@/src/lib/datetime";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

export default function TodaysSchedule({ events }: { events: DashboardEvent[] }) {
  // The "Schedule options" button that used to sit here was a decoy: this is a Server
  // Component, so it could never receive a handler, and at 28px it was under the target
  // floor anyway. A control that does nothing is worse than no control.
  if (events.length === 0) {
    return (
      <section className="font-sans">
        <h2 className="mb-5 border-b border-line pb-3 font-display text-xl text-ink">
          Today&rsquo;s schedule
        </h2>
        <EmptyState
          size="sm"
          icon={<CalendarClock className="h-5 w-5" />}
          title="Nothing scheduled today"
          description="Events starting today will appear here."
        />
      </section>
    );
  }

  return (
    <section className="font-sans">
      <h2 className="mb-5 border-b border-line pb-3 font-display text-xl text-ink">
        Today&rsquo;s schedule
      </h2>

      <ul className="space-y-0">
        {events.map((event, index) => {
          const isActive = event.status === "ACTIVE";

          return (
            <li key={event.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center">
                {/* Filled vs hollow, so the pill's border is never the only thing
                    saying which row is live. */}
                <span
                  className={`mt-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    isActive ? "border-gray-900 bg-gray-900" : "border-ink-soft bg-paper"
                  }`}
                />
                {index < events.length - 1 && <span className="mt-1.5 h-full w-px min-h-12 bg-line-loud" />}
              </div>

              <div className="border-b border-line pb-4 last:border-b-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-2xs font-medium uppercase text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </p>
                    <h3 className="mt-1 text-base text-ink">{event.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      {event.location}
                    </p>
                  </div>

                  {/* Bordered, not filled. The inactive border is 1.42:1 on canvas — far under the
                      3:1 component floor, and fine only because this is a static label whose
                      state is carried by the word inside it and by the filled/hollow dot. */}
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-2xs font-medium uppercase ${
                      isActive ? "border border-gray-900 text-gray-900" : "border border-line-loud text-ink-soft"
                    }`}
                  >
                    {isActive ? "Live View" : "Upcoming"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
