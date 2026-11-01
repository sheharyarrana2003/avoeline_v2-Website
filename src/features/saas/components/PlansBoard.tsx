"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import {
  ALL_MODULE_KEYS,
  isFreeModule,
  isOrganizerModule,
  isVendorModule,
  MODULE_LABELS,
  ORGANIZER_MODULE_KEYS,
  VENDOR_MODULE_KEYS,
} from "@/src/features/permissions/moduleKeys";
import { deletePlan, savePlan, togglePlanActive } from "@/src/features/saas/actions/plans.action";
import type { PlanRow } from "@/src/features/saas/saas.service";

const PLAN_CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"] as const;

function PlanForm({
  plan,
  formId,
  onDone,
}: {
  plan?: PlanRow;
  formId: string;
  onDone?: () => void;
}) {
  const p = plan?.id ?? "new";
  const included = new Set(plan?.included_modules ?? []);
  const currency =
    plan?.currency && PLAN_CURRENCIES.includes(plan.currency as (typeof PLAN_CURRENCIES)[number])
      ? plan.currency
      : "PKR";
  const audience =
    plan?.audience === "vendor" || plan?.audience === "both" ? plan.audience : "organizer";
  const moduleKeys =
    audience === "vendor"
      ? VENDOR_MODULE_KEYS
      : audience === "both"
        ? ALL_MODULE_KEYS
        : ORGANIZER_MODULE_KEYS;

  return (
    <form
      id={formId}
      action={async (fd) => {
        await savePlan(fd);
        onDone?.();
      }}
      className="space-y-4"
    >
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id={`${p}-name`} name="name" label="Name" required defaultValue={plan?.name ?? ""} />
        <Input
          id={`${p}-key`}
          name="key"
          label="Key"
          required
          defaultValue={plan?.key ?? ""}
          readOnly={plan?.key === "free" || plan?.key === "vendor_free"}
          helperText="Stored on organizer/vendor profiles; renaming carries them over."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${p}-audience`} className={labelClass}>
            Audience
          </label>
          <select
            id={`${p}-audience`}
            name="audience"
            defaultValue={audience}
            className={fieldClass}
          >
            <option value="organizer">Organizer</option>
            <option value="vendor">Vendor</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${p}-currency`} className={labelClass}>
            Currency
          </label>
          <select
            id={`${p}-currency`}
            name="currency"
            defaultValue={currency}
            className={fieldClass}
          >
            {PLAN_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Input
          id={`${p}-sort`}
          name="sortOrder"
          type="number"
          label="Sort order"
          defaultValue={String(plan?.sort_order ?? 0)}
        />
        <Input
          id={`${p}-monthly`}
          name="priceMonthly"
          type="number"
          min={0}
          step="any"
          label="Monthly price"
          defaultValue={plan?.price_monthly != null ? String(plan.price_monthly) : ""}
        />
        <Input
          id={`${p}-yearly`}
          name="priceYearly"
          type="number"
          min={0}
          step="any"
          label="Yearly price (optional)"
          defaultValue={plan?.price_yearly != null ? String(plan.price_yearly) : ""}
        />
        <Input
          id={`${p}-desc`}
          name="description"
          label="Description"
          wrapperClassName="sm:col-span-2"
          defaultValue={plan?.description ?? ""}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
          Features in this plan
        </legend>
        <p className="text-xs text-ink-soft">
          Every module is optional, including the usual free set. Untick one to take it off this
          plan.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {moduleKeys.map((k) => (
            <label
              key={k}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                name="modules"
                value={k}
                defaultChecked={
                  plan
                    ? included.has(k)
                    : isFreeModule(k) ||
                      (isVendorModule(k) && !k.includes("analytics") && !k.includes("portfolio"))
                }
              />
              {MODULE_LABELS[k]}
              {isOrganizerModule(k) && audience === "both" ? (
                <span className="text-2xs text-ink-soft">org</span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={plan ? plan.is_active : true}
          disabled={plan?.key === "free" || plan?.key === "vendor_free"}
        />
        Active (selectable at signup)
      </label>
      {plan?.key === "free" || plan?.key === "vendor_free" ? (
        <input type="hidden" name="isActive" value="true" />
      ) : null}
    </form>
  );
}

export function PlansBoard({
  plans,
  counts,
}: {
  plans: PlanRow[];
  counts: Record<string, number>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<PlanRow | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" className={buttonClass()} onClick={() => setCreateOpen(true)}>
          Create plan
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const included = plan.included_modules ?? [];
          const monthly =
            plan.price_monthly != null && plan.price_monthly !== ""
              ? formatCurrency(Number(plan.price_monthly), plan.currency || "PKR", "—")
              : "—";
          const yearly =
            plan.price_yearly != null && plan.price_yearly !== ""
              ? formatCurrency(Number(plan.price_yearly), plan.currency || "PKR", "—")
              : null;
          return (
            <Card key={plan.id} tone="raised">
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg text-ink">{plan.name}</h2>
                    <p className="mt-1 text-xs text-ink-soft">
                      {plan.description || "No description."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge size="sm">{plan.key}</Badge>
                    {plan.is_active ? (
                      <Badge size="sm" variant="success">
                        active
                      </Badge>
                    ) : (
                      <Badge size="sm" variant="neutral">
                        inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-ink">
                  {monthly} / month
                  {yearly ? <span className="text-ink-soft"> · {yearly} / year</span> : null}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {included.length === 0 ? (
                    <span className="text-xs text-ink-soft">No features included.</span>
                  ) : (
                    included.map((k) => (
                      <Badge key={k} size="sm" variant="success">
                        {MODULE_LABELS[k as keyof typeof MODULE_LABELS] ?? k}
                      </Badge>
                    ))
                  )}
                </div>
                <p className="text-xs text-ink-soft">
                  {counts[plan.key] ?? 0} organizer(s) on this plan
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={() => setEdit(plan)}
                  >
                    Edit
                  </button>
                  {plan.key !== "free" ? (
                    <>
                      <form action={togglePlanActive}>
                        <input type="hidden" name="id" value={plan.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={plan.is_active ? "false" : "true"}
                        />
                        <SubmitButton className={buttonClass("secondary", "sm")}>
                          {plan.is_active ? "Deactivate" : "Activate"}
                        </SubmitButton>
                      </form>
                      {!counts[plan.key] ? (
                        <form action={deletePlan}>
                          <input type="hidden" name="id" value={plan.id} />
                          <SubmitButton className={buttonClass("destructive", "sm")}>
                            Delete
                          </SubmitButton>
                        </form>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create plan"
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" form="plan-create-form" className={buttonClass()}>
              Create plan
            </button>
          </>
        }
      >
        <PlanForm formId="plan-create-form" onDone={() => setCreateOpen(false)} />
      </Modal>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `Edit ${edit.name}` : "Edit plan"}
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={() => setEdit(null)}
            >
              Cancel
            </button>
            <button type="submit" form="plan-edit-form" className={buttonClass()}>
              Save plan
            </button>
          </>
        }
      >
        {edit ? (
          <PlanForm
            key={edit.id}
            formId="plan-edit-form"
            plan={edit}
            onDone={() => setEdit(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
