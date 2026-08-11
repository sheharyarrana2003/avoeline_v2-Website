import { DashboardEvent } from "../types";
import { MoreHorizontal, Clock, MapPin } from "lucide-react";
import { formatTime } from "@/src/lib/datetime";

export default function TodaysSchedule({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="bg-gray-100 rounded-2xl border border-gray-300/60 p-5 sm:p-6 shadow-xs font-sans">
      <div className="mb-4 flex items-center justify-between border-b border-gray-300/60 pb-3">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900">
          Today&apos;s Schedule
        </h2>
        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          aria-label="Schedule options"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <ul className="space-y-0">
        {events.map((event, index) => {
          const isActive = event.status === "ACTIVE";

          return (
            <li key={event.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    isActive
                      ? "border-black bg-black shadow-xs"
                      : "border-gray-300 bg-gray-400"
                  }`}
                />
                {index < events.length - 1 && <span className="mt-1.5 h-full w-px min-h-12 bg-gray-300/80" />}
              </div>

              <div className="border-b border-gray-300/40 pb-4 last:border-b-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-gray-900">{event.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      {event.location}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? "bg-black text-white" : "bg-gray-200 text-gray-600"
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
