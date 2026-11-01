import { suppressBuckets } from "../../consent.logic";
import type { MarketingInsights } from "../../consent.service";

function BucketTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ bucket: string; count: number }>;
}) {
  const safe = suppressBuckets(rows);
  return (
    <div className="rounded-2xl border border-line p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      {safe.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">
          No groups with 5 or more (small-group suppression).
        </p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-ink-soft">
              <th className="py-1 font-medium">Group</th>
              <th className="py-1 font-medium tabular-nums">Count</th>
            </tr>
          </thead>
          <tbody>
            {safe.map((r) => (
              <tr key={r.bucket} className="border-t border-line">
                <td className="py-1.5">{r.bucket}</td>
                <td className="py-1.5 tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function InsightsCmsPanel({ data }: { data: MarketingInsights | null }) {
  if (!data) {
    return <p className="text-sm text-ink-soft">Insights could not be loaded.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Aggregate counts only — no names, emails, or phone numbers. Groups under 5 are hidden.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Events</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.events_total}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Registrations</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.registrations_total}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Certificates</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.certificates_total}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BucketTable title="Events by month" rows={data.events_by_month} />
        <BucketTable title="Events by category" rows={data.events_by_category} />
        <BucketTable title="Events by city" rows={data.events_by_city} />
      </div>
    </div>
  );
}
