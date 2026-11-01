"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { adminTenantsHref } from "@/src/features/saas/tenantBoard.filters";
import type { OverrideListRow, TenantBoardFilters } from "@/src/features/saas/tenantBoard.types";
import { MODULE_LABELS } from "@/src/features/permissions/moduleKeys";
import { bulkClearOverridesAction } from "@/src/features/saas/actions/subscriptions.action";

export function OverridesTab({
  rows,
  nextCursor,
  filters,
  canManage,
}: {
  rows: OverrideListRow[];
  nextCursor: string | null;
  filters: TenantBoardFilters;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, OverrideListRow[]>();
    for (const row of rows) {
      const key = row.tenantName;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [rows]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelected = () => {
    setError(null);
    start(async () => {
      const res = await bulkClearOverridesAction({
        overrideIds: [...selected],
        reason,
        sendEmail: true,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setConfirmOpen(false);
      setSelected(new Set());
      setReason("");
      router.refresh();
    });
  };

  if (!rows.length) {
    return (
      <EmptyState
        size="sm"
        title="No access overrides"
        description="Grants and denies you set on tenants will list here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass(
            filters.overrideEffect.includes("grant") ? "primary" : "secondary",
            "sm",
          )}
          onClick={() =>
            router.push(
              adminTenantsHref(filters, {
                overrideEffect: filters.overrideEffect.includes("grant") ? [] : ["grant"],
                overrideCursor: null,
              }),
            )
          }
        >
          Grants
        </button>
        <button
          type="button"
          className={buttonClass(
            filters.overrideEffect.includes("deny") ? "primary" : "secondary",
            "sm",
          )}
          onClick={() =>
            router.push(
              adminTenantsHref(filters, {
                overrideEffect: filters.overrideEffect.includes("deny") ? [] : ["deny"],
                overrideCursor: null,
              }),
            )
          }
        >
          Denies
        </button>
        {canManage && selected.size > 0 ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setConfirmOpen(true)}
          >
            Clear selected ({selected.size})
          </button>
        ) : null}
      </div>

      <div className="space-y-6">
        {grouped.map(([tenant, list]) => (
          <section key={tenant} className="rounded-xl border border-line p-4">
            <h3 className="font-medium text-ink">{tenant}</h3>
            <ul className="mt-3 divide-y divide-line">
              {list.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  {canManage ? (
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select ${row.moduleKey}`}
                    />
                  ) : null}
                  <span className={row.denied ? "text-danger" : "text-success"}>
                    {row.denied ? "Deny" : "Grant"}
                  </span>
                  <span className="font-medium text-ink">
                    {MODULE_LABELS[row.moduleKey as keyof typeof MODULE_LABELS] || row.moduleKey}
                  </span>
                  {row.expiresAt ? (
                    <span className="text-xs text-ink-soft">
                      expires {new Date(row.expiresAt).toLocaleDateString()}
                    </span>
                  ) : null}
                  {row.reason ? (
                    <span className="text-xs text-ink-soft">· {row.reason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {nextCursor ? (
        <Link
          href={adminTenantsHref(filters, { overrideCursor: nextCursor })}
          className={buttonClass("ghost", "sm")}
        >
          Load more
        </Link>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Clear selected overrides?"
        description="Tenants will return to plan defaults for these features. A reason is required."
        confirmLabel={pending ? "Clearing…" : "Clear overrides"}
        busy={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={clearSelected}
      />

      {confirmOpen ? (
        <div className="fixed bottom-6 left-1/2 z-[60] w-full max-w-md -translate-x-1/2 rounded-xl border border-line bg-paper p-4 shadow-lg">
          <label className="block">
            <span className={labelClass}>Reason</span>
            <input
              className={fieldClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
