"use client";

import { useTransition } from "react";
import {
  approveSubscriptionPaymentAction,
  rejectSubscriptionPaymentAction,
} from "@/src/features/billing/actions/billing.action";
import { formatCurrency } from "@/src/lib/money";

type Row = {
  id: string;
  email: string;
  name: string;
  role: string;
  planKey: string;
  amount: number;
  currency: string;
  screenshotUrl: string | null;
  createdAt: string | null;
};

export function PendingPaymentsClient({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();

  if (!rows.length) {
    return <p className="mt-8 text-sm text-ink-soft">No pending subscription payments.</p>;
  }

  return (
    <ul className="mt-6 space-y-4">
      {rows.map((row) => (
        <li key={row.id} className="rounded-xl border border-line bg-paper p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">
                {row.name} · {row.email}
              </p>
              <p className="text-sm text-ink-soft">
                {row.role} · plan {row.planKey} · {formatCurrency(row.amount, row.currency)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    await approveSubscriptionPaymentAction({ paymentId: row.id });
                    window.location.reload();
                  })
                }
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const reason = window.prompt("Rejection reason (optional)") || undefined;
                    await rejectSubscriptionPaymentAction({ paymentId: row.id, reason });
                    window.location.reload();
                  })
                }
              >
                Reject
              </button>
            </div>
          </div>
          {row.screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={row.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 block">
              <img
                src={row.screenshotUrl}
                alt="Payment screenshot"
                className="max-h-48 rounded-lg border border-line"
              />
            </a>
          ) : (
            <p className="mt-2 text-xs text-ink-soft">No preview available</p>
          )}
        </li>
      ))}
    </ul>
  );
}
