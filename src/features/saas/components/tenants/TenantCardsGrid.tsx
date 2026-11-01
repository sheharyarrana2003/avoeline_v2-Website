"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { PAGE_SIZE, type TenantBoardCard } from "@/src/features/saas/tenantBoard.types";
import { adminTenantsHref, hasActiveTenantFilters } from "@/src/features/saas/tenantBoard.filters";
import type { TenantBoardFilters } from "@/src/features/saas/tenantBoard.types";
import { useRouter } from "next/navigation";

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function TenantCardsGrid({
  cards,
  total,
  filters,
  onManage,
}: {
  cards: TenantBoardCard[];
  total: number;
  filters: TenantBoardFilters;
  onManage: (card: TenantBoardCard) => void;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!cards.length) {
    return (
      <EmptyState
        size="sm"
        title={hasActiveTenantFilters(filters) ? "No matching tenants" : "No tenant accounts yet"}
        description={
          hasActiveTenantFilters(filters)
            ? "Try clearing filters or broadening your search."
            : "Create a department, organizer, or vendor login to get started."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <li
            key={`${card.kind}-${card.id}`}
            className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4"
          >
            <div className="flex items-start gap-3">
              {card.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.avatarUrl}
                  alt=""
                  className="h-11 w-11 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-muted text-sm font-semibold text-ink">
                  {avatarInitials(card.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{card.name}</p>
                <p className="truncate text-sm text-ink-soft">{card.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-line bg-muted px-2 py-0.5 text-2xs capitalize text-ink">
                    {card.kind}
                  </span>
                  <StatusBadge status={card.status} size="sm" marker="dot" />
                  <span className="rounded-md border border-line px-2 py-0.5 text-2xs text-ink-soft">
                    {card.planLabel}
                  </span>
                </div>
              </div>
              <details className="relative">
                <summary className="list-none rounded-md p-1.5 text-ink-soft hover:bg-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                  <MoreHorizontal className="h-4 w-4" />
                </summary>
                <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-line bg-paper py-1 shadow-md">
                  <Link
                    href={card.detailHref}
                    className="block px-3 py-1.5 text-sm text-ink hover:bg-muted"
                  >
                    Open detail
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-muted"
                    onClick={() => onManage(card)}
                  >
                    Manage
                  </button>
                </div>
              </details>
            </div>

            {card.instituteName ? (
              <p className="text-xs text-ink-soft">Institute · {card.instituteName}</p>
            ) : null}

            <p className="text-xs text-ink-soft">
              {card.kind === "vendor"
                ? `${card.metrics.bookings} bookings`
                : card.kind === "department"
                  ? `${card.metrics.clubs} clubs · ${card.metrics.events} events`
                  : `${card.metrics.events} events`}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {card.grants > 0 ? (
                <span className="rounded-md bg-success-soft px-2 py-0.5 text-2xs text-success">
                  {card.grants} granted
                </span>
              ) : null}
              {card.denies > 0 ? (
                <span className="rounded-md bg-danger-soft px-2 py-0.5 text-2xs text-danger">
                  {card.denies} denied
                </span>
              ) : null}
              {card.hasCustomPricing ? (
                <span className="rounded-md bg-accent-soft px-2 py-0.5 text-2xs text-accent-strong">
                  Custom pricing
                </span>
              ) : null}
              {card.earliestExpiry ? (
                <span className="rounded-md bg-warning-soft px-2 py-0.5 text-2xs text-warning">
                  Expires {new Date(card.earliestExpiry).toLocaleDateString()}
                </span>
              ) : null}
            </div>

            <div className="mt-auto flex gap-2 pt-1">
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => onManage(card)}
              >
                Manage
              </button>
              <Link href={card.detailHref} className={buttonClass("ghost", "sm")}>
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            Page {filters.page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              disabled={filters.page <= 1}
              onClick={() =>
                router.push(adminTenantsHref(filters, { page: Math.max(1, filters.page - 1) }))
              }
            >
              Previous
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              disabled={filters.page >= totalPages}
              onClick={() => router.push(adminTenantsHref(filters, { page: filters.page + 1 }))}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
