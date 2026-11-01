"use client";

import { useState, useTransition } from "react";
import type { PlanRow } from "@/src/features/saas/saas.service";
import type { PlatformBillingSettings } from "@/src/features/billing/billing.service";
import { formatCurrency } from "@/src/lib/money";
import { planIsFree } from "@/src/features/onboarding/planHelpers";

export function PlanSelectStep({
  plans,
  billing,
  onSelectFree,
  onSubmitPaid,
}: {
  plans: PlanRow[];
  billing: PlatformBillingSettings;
  onSelectFree: (planKey: string) => Promise<{ success: boolean; error?: string } | void>;
  onSubmitPaid: (input: {
    planKey: string;
    file: File;
  }) => Promise<{ success: boolean; error?: string } | void>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paidKey, setPaidKey] = useState<string | null>(null);
  const paidPlan = plans.find((p) => p.key === paidKey) || null;

  return (
    <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-line bg-paper p-6">
      <div>
        <h2 className="font-display text-xl text-ink">Choose a plan</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Free plans open your dashboard immediately. Paid plans need a bank transfer and platform
          approval.
        </p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!paidPlan ? (
        <ul className="space-y-3">
          {plans.map((plan) => {
            const free = planIsFree(plan);
            const price = Number(plan.price_monthly ?? 0);
            return (
              <li key={plan.key} className="rounded-xl border border-line px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{plan.name}</p>
                    {plan.description ? (
                      <p className="text-sm text-ink-soft">{plan.description}</p>
                    ) : null}
                    <p className="mt-1 text-sm tabular-nums text-ink">
                      {free ? "Free" : `${formatCurrency(price, plan.currency || "PKR")} / month`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
                    onClick={() =>
                      start(async () => {
                        setError(null);
                        if (free) {
                          const r = await onSelectFree(plan.key);
                          if (r && !r.success) setError(r.error || "Could not select plan.");
                        } else {
                          setPaidKey(plan.key);
                        }
                      })
                    }
                  >
                    {free ? "Continue free" : "Select & pay"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            className="text-xs text-ink-soft underline"
            onClick={() => setPaidKey(null)}
          >
            ← Back to plans
          </button>
          <h3 className="font-medium text-ink">Pay for {paidPlan.name}</h3>
          <p className="text-sm text-ink-soft">
            Amount:{" "}
            <strong className="text-ink">
              {formatCurrency(
                Number(paidPlan.price_monthly ?? 0),
                paidPlan.currency || billing.currency,
              )}
            </strong>
          </p>
          <div className="rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm text-ink">
            <p className="font-medium">Transfer to</p>
            <ul className="mt-2 space-y-1 text-ink-soft">
              {billing.bankName ? <li>Bank: {billing.bankName}</li> : null}
              {billing.accountTitle ? <li>Title: {billing.accountTitle}</li> : null}
              {billing.accountNumber ? <li>Account: {billing.accountNumber}</li> : null}
              {billing.iban ? <li>IBAN: {billing.iban}</li> : null}
              {billing.branch ? <li>Branch: {billing.branch}</li> : null}
              {billing.jazzcash ? <li>JazzCash: {billing.jazzcash}</li> : null}
              {billing.easypaisa ? <li>EasyPaisa: {billing.easypaisa}</li> : null}
            </ul>
            {billing.instructions ? (
              <p className="mt-3 text-ink-soft">{billing.instructions}</p>
            ) : null}
            {!billing.bankName && !billing.accountNumber && !billing.iban ? (
              <p className="mt-2 text-amber-800">
                Platform bank details are not configured yet. Ask the SaaS owner to set them under
                Admin → Billing.
              </p>
            ) : null}
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const file = fd.get("screenshot");
              if (!(file instanceof File) || file.size <= 0) {
                setError("Upload a payment screenshot.");
                return;
              }
              start(async () => {
                setError(null);
                const r = await onSubmitPaid({ planKey: paidPlan.key, file });
                if (r && !r.success) setError(r.error || "Upload failed.");
              });
            }}
          >
            <label className="block text-sm text-ink">
              Payment screenshot
              <input
                name="screenshot"
                type="file"
                accept="image/*,application/pdf"
                required
                className="mt-1 block w-full text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
            >
              {pending ? "Uploading…" : "Submit for approval"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
