import { DashboardEvent } from "../types";
import { MoreHorizontal } from "lucide-react";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default function TodaysSchedule({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-800">
          Today&apos;s Schedule
        </h2>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Schedule options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <ul className="space-y-0">
        {events.map((event, index) => {
          const isActive = event.status === "ACTIVE";

          return (
            <li key={event.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 size-4 rounded-full border-2 ${
                    isActive
                      ? "border-[#7454f6] bg-[#7454f6] shadow-[0_0_0_4px_rgba(116,84,246,0.16)]"
                      : "border-slate-200 bg-slate-300"
                  }`}
                />
                {index < events.length - 1 && <span className="mt-2 h-full w-px min-h-16 bg-slate-200" />}
              </div>

              <div className="border-b border-slate-100 pb-5 last:border-b-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#7454f6]">
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </p>
                    <h3 className="mt-2 text-base font-extrabold text-slate-900">{event.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-400">{event.location}</p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-extrabold ${
                      isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400"
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
