"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { updatePlanDisplayAction } from "../../actions/settings.action";

export type PlanDisplayRow = {
  id: string;
  key: string;
  name: string;
  is_public: boolean;
  is_recommended: boolean;
  badge_text: string | null;
  tagline: string | null;
  highlight_features: string[];
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  price_monthly: number | null;
};

export function PlansDisplayPanel({ plans }: { plans: PlanDisplayRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(plans);

  function patch(id: string, partial: Partial<PlanDisplayRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Flags and copy only. Prices and features stay in Plans / Tenant accounts.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {rows.map((plan) => (
        <div key={plan.id} className="space-y-3 rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold text-ink">
              {plan.name} <span className="text-ink-soft">({plan.key})</span>
            </h3>
            <p className="text-xs text-ink-soft">
              Price (read-only): {plan.price_monthly == null ? "—" : plan.price_monthly}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_public}
                onChange={(e) => patch(plan.id, { is_public: e.target.checked })}
              />
              Public
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_recommended}
                onChange={(e) => patch(plan.id, { is_recommended: e.target.checked })}
              />
              Recommended
            </label>
            <div>
              <label className={labelClass}>Badge</label>
              <input
                className={fieldClass}
                value={plan.badge_text ?? ""}
                onChange={(e) => patch(plan.id, { badge_text: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Sort</label>
              <input
                className={fieldClass}
                type="number"
                value={plan.sort_order}
                onChange={(e) => patch(plan.id, { sort_order: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Tagline</label>
              <input
                className={fieldClass}
                value={plan.tagline ?? ""}
                onChange={(e) => patch(plan.id, { tagline: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Highlight features (one per line)</label>
              <textarea
                className={`${fieldClass} min-h-20`}
                value={(plan.highlight_features ?? []).join("\n")}
                onChange={(e) =>
                  patch(plan.id, {
                    highlight_features: e.target.value
                      .split(/\n/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>CTA label</label>
              <input
                className={fieldClass}
                value={plan.cta_label ?? ""}
                onChange={(e) => patch(plan.id, { cta_label: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>CTA href</label>
              <input
                className={fieldClass}
                value={plan.cta_href ?? ""}
                onChange={(e) => patch(plan.id, { cta_href: e.target.value })}
              />
            </div>
          </div>
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updatePlanDisplayAction({
                  id: plan.id,
                  is_public: plan.is_public,
                  is_recommended: plan.is_recommended,
                  badge_text: plan.badge_text || null,
                  tagline: plan.tagline || null,
                  highlight_features_text: (plan.highlight_features ?? []).join("\n"),
                  cta_label: plan.cta_label || null,
                  cta_href: plan.cta_href || null,
                  sort_order: plan.sort_order,
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setError(null);
                  router.refresh();
                }
              })
            }
          >
            Save {plan.name}
          </button>
        </div>
      ))}
    </div>
  );
}
