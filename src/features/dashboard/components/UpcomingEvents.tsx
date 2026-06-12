import { DashboardEvent } from "@/src/features/dashboard/types";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function UpcomingEvents({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
      <h2 className="mb-6 text-base font-extrabold uppercase tracking-wide text-slate-800">
        Upcoming Events
      </h2>

      <ul className="space-y-6">
        {events.map((event) => {
          const percent = Math.min(100, Math.round((event.registeredCount / event.maxCapacity) * 100));

          return (
            <li key={event.id}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <h3 className="text-sm font-extrabold text-slate-900">{event.title}</h3>
                <time className="shrink-0 text-xs font-extrabold text-slate-400">
                  {formatDate(event.startDate)}
                </time>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#7454f6]" style={{ width: `${percent}%` }} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs font-extrabold text-slate-400">
                  {event.registeredCount} / {event.maxCapacity} Reg.
                </p>
                <a href={`/organizer/events/${event.id}`} className="text-xs font-extrabold uppercase tracking-widest text-[#7454f6]">
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
