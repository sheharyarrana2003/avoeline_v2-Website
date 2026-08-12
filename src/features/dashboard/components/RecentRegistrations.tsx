import { RecentRegistration } from "@/src/features/dashboard/types";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Users } from "lucide-react";

export default function RecentRegistrations({ registerations }: { registerations: RecentRegistration[] }) {
  return (
    // Uncarded, matching its two siblings on this screen.
    <section className="font-sans">
      <h2 className="mb-5 border-b border-line pb-3 font-display text-xl text-ink">
        Recent registrations
      </h2>

      {registerations.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Users className="h-5 w-5" />}
          title="No registrations yet"
          description="Attendees who sign up for your events will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          {/* Every cell carries its own right gutter. Without one the headings ran
              together as "ATTENDEEEVENT" and the status pill touched the amount. */}
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-3 pr-6 text-2xs font-medium uppercase text-ink-soft">Attendee</th>
                <th className="pb-3 pr-6 text-2xs font-medium uppercase text-ink-soft">Event</th>
                <th className="pb-3 pr-6 text-2xs font-medium uppercase text-ink-soft">Status</th>
                <th className="pb-3 text-right text-2xs font-medium uppercase text-ink-soft">Amount</th>
              </tr>
            </thead>

            <tbody>
              {registerations.map((registration) => (
                <tr key={registration.id} className="border-b border-line transition-colors last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-2xs font-medium text-gray-700">
                        {registration.attendeeName.charAt(0)}
                      </span>
                      <span className="text-sm text-ink">{registration.attendeeName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-6 text-sm text-ink-soft">{registration.eventName}</td>
                  <td className="py-3 pr-6">
                    {/* Was a three-branch ternary whose branches were byte-identical --
                        a leftover from the colour conversion. StatusBadge already maps
                        every status to a tone, so the branch was never needed. */}
                    <StatusBadge status={registration.status} size="sm" />
                  </td>
                  <td className="py-3 text-right text-sm text-ink tabular-nums whitespace-nowrap">
                    {formatCurrency(registration.amountPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
