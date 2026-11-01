"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import type { PlanOption, PricingListRow } from "@/src/features/saas/tenantBoard.types";
import { saveCustomPricingAction } from "@/src/features/saas/actions/subscriptions.action";
import { CustomPricingModal } from "./CustomPricingModal";

export function PricingTab({
  rows,
  canManage,
}: {
  rows: PricingListRow[];
  canManage: boolean;
  plans: PlanOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<PricingListRow | null>(null);
  const [endTarget, setEndTarget] = useState<PricingListRow | null>(null);

  const active = rows.filter((r) => r.active);

  const endAgreement = () => {
    if (!endTarget) return;
    start(async () => {
      await saveCustomPricingAction({
        agreementId: endTarget.id,
        organizerId: endTarget.organizerId,
        endAgreement: true,
        sendEmail: false,
      });
      setEndTarget(null);
      router.refresh();
    });
  };

  if (!active.length) {
    return (
      <EmptyState
        size="sm"
        title="No active pricing agreements"
        description="Custom discounts and flat rates for organizers appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line rounded-xl border border-line">
        {active.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium text-ink">{row.tenantName}</p>
              <p className="text-sm text-ink-soft">
                {[
                  row.discountPct != null ? `${row.discountPct}% off` : null,
                  row.flatMonthly != null ? `${row.flatMonthly}/mo` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Custom terms"}
              </p>
            </div>
            {canManage ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={() => setEdit(row)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setEndTarget(row)}
                >
                  End
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {edit ? (
        <CustomPricingModal
          open
          onClose={() => setEdit(null)}
          seed={{
            id: edit.organizerId,
            kind: "organizer",
            name: edit.tenantName,
            email: "",
            avatarUrl: null,
            planKey: "",
            planLabel: "",
            status: "active",
            instituteName: null,
            orgId: null,
            detailHref: `/admin/organizers/${edit.organizerId}`,
            metrics: { events: 0, clubs: 0, bookings: 0 },
            grants: 0,
            denies: 0,
            hasCustomPricing: true,
            earliestExpiry: null,
            createdAt: edit.createdAt,
          }}
          cards={[]}
          agreementId={edit.id}
          initial={{
            discountPct: edit.discountPct,
            flatMonthly: edit.flatMonthly,
            notes: edit.notes,
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!endTarget}
        title="End pricing agreement?"
        description={`Deactivate the custom pricing for ${endTarget?.tenantName || "this tenant"}.`}
        confirmLabel={pending ? "Ending…" : "End agreement"}
        busy={pending}
        onCancel={() => setEndTarget(null)}
        onConfirm={endAgreement}
      />
    </div>
  );
}
