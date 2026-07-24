import { RecentRegistration } from "@/src/features/dashboard/types";

export default function RecentRegistrations({ registerations }: { registerations: RecentRegistration[] }) {
  return (
    <section className="bg-[#F5F5F5] rounded-2xl border border-gray-300/60 p-5 sm:p-6 shadow-xs font-sans overflow-hidden">
      <h2 className="mb-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300/60 pb-3">
        Recent Registrations
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse">
          <thead>
            <tr className="border-b border-gray-300/60 text-left">
              <th className="pb-3 pl-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Attendee</th>
              <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Event</th>
              <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
              <th className="pb-3 pr-1 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Amount</th>
            </tr>
          </thead>

          <tbody>
            {registerations.map((registration) => (
              <tr key={registration.id} className="border-b border-gray-300/40 last:border-b-0 hover:bg-gray-200/40 transition-colors">
                <td className="py-3 pl-1">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                      {registration.attendeeName.charAt(0)}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{registration.attendeeName}</span>
                  </div>
                </td>
                <td className="py-3 text-xs font-medium text-gray-600">{registration.eventName}</td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      registration.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : registration.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {registration.status}
                  </span>
                </td>
                <td className="py-3 pr-1 text-right text-xs font-bold text-gray-900">
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
