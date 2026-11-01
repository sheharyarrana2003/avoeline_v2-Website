"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { adminTenantsHref } from "@/src/features/saas/tenantBoard.filters";
import type { ActivityRow, TenantBoardFilters } from "@/src/features/saas/tenantBoard.types";
import { resendFailedEmailAction } from "@/src/features/saas/actions/subscriptions.action";

export function ActivityTab({
  rows,
  nextCursor,
  filters,
}: {
  rows: ActivityRow[];
  nextCursor: string | null;
  filters: TenantBoardFilters;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const resend = (id: string) => {
    start(async () => {
      await resendFailedEmailAction({ emailLogId: id });
      router.refresh();
    });
  };

  if (!rows.length) {
    return (
      <EmptyState
        size="sm"
        title="No recent activity"
        description="Moderation actions and platform emails will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{row.title}</p>
              <p className="text-xs text-ink-soft">{row.detail}</p>
              <p className="mt-1 text-2xs text-ink-faint">
                {row.source} · {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {row.status ? <StatusBadge status={row.status} size="sm" marker="dot" /> : null}
              {row.canResend && row.emailLogId ? (
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  disabled={pending}
                  onClick={() => resend(row.emailLogId!)}
                >
                  Resend
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {nextCursor ? (
        <Link
          href={adminTenantsHref(filters, { activityCursor: nextCursor })}
          className={buttonClass("ghost", "sm")}
        >
          Load more
        </Link>
      ) : null}
    </div>
  );
}
