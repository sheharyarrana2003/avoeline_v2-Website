import { RecentRegistration } from "@/src/features/dashboard/types";

export default function RecentRegistrations({ registerations }: { registerations: RecentRegistration[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(21,27,38,0.06)]">
      <h2 className="mb-6 text-base font-extrabold uppercase tracking-wide text-slate-800">
        Recent Registrations
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="pb-4 pl-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Attendee</th>
              <th className="pb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Event</th>
              <th className="pb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Status</th>
              <th className="pb-4 pr-2 text-right text-xs font-extrabold uppercase tracking-widest text-slate-400">Amount</th>
            </tr>
          </thead>

          <tbody>
            {registerations.map((registration) => (
              <tr key={registration.id} className="border-b border-slate-100 last:border-b-0">
                <td className="py-4 pl-2">
                  <div className="flex items-center gap-4">
                    <span className="size-8 rounded-full bg-slate-200" />
                    <span className="text-sm font-extrabold text-slate-800">{registration.attendeeName}</span>
                  </div>
                </td>
                <td className="py-4 text-sm font-semibold text-slate-500">{registration.eventName}</td>
                <td className="py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${
                      registration.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-600"
                        : registration.status === "PENDING"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {registration.status}
                  </span>
                </td>
                <td className="py-4 pr-2 text-right text-sm font-extrabold text-slate-900">
                  PKR {registration.amountPaid.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
