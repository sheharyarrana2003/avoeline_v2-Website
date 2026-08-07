import { DashboardEvent } from "@/src/features/dashboard/types";
import { formatDate } from "@/src/lib/datetime";

export default function UpcomingEvents({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="bg-gray-100 rounded-2xl border border-gray-300/60 p-5 sm:p-6 shadow-xs font-sans">
      <h2 className="mb-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300/60 pb-3">
        Upcoming Events
      </h2>

      <ul className="space-y-4">
        {events.map((event) => {
          const percent = Math.min(100, Math.round((event.registeredCount / event.maxCapacity) * 100));

          return (
            <li key={event.id} className="bg-white rounded-xl p-3.5 border border-gray-300/50 shadow-2xs">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-xs font-bold text-gray-900 line-clamp-1">{event.title}</h3>
                <time className="shrink-0 text-[10px] font-semibold text-gray-500">
                  {formatDate(event.startDate)}
                </time>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-black" style={{ width: `${percent}%` }} />
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-500">
                  {event.registeredCount} / {event.maxCapacity} Reg.
                </p>
                <a href={`/organizer/events/${event.id}`} className="text-[11px] font-bold uppercase tracking-wider text-black hover:underline">
                  Manage
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
