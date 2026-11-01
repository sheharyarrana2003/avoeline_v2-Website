"use client";

import { useActionState, useMemo, useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatCurrency } from "@/src/lib/money";
import type { ActionResult } from "@/src/lib/action";
import {
  deleteEventExpenseAction,
  exportEventExpensesAction,
  saveEventExpenseAction,
  setEventBudgetAction,
} from "../actions/expenses.action";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  EXPENSE_STATUSES,
  type EventExpense,
  type ExpenseTotals,
} from "../types";
import { Wallet } from "lucide-react";

export function ExpensesClient({
  eventId,
  expenses,
  totals,
  budgetTotal,
  prefillVendorId,
  currency = "PKR",
}: {
  eventId: string;
  expenses: EventExpense[];
  totals: ExpenseTotals;
  budgetTotal: number | null;
  prefillVendorId?: string | null;
  currency?: string;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(Boolean(prefillVendorId));
  const [editing, setEditing] = useState<EventExpense | null>(null);
  const [saveState, saveAction] = useActionState<ActionResult | null, FormData>(
    saveEventExpenseAction,
    null,
  );
  const [budgetState, budgetAction] = useActionState<ActionResult | null, FormData>(
    setEventBudgetAction,
    null,
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (status !== "all" && e.status !== status) return false;
      if (!needle) return true;
      return [e.title, e.description, e.category].join(" ").toLowerCase().includes(needle);
    });
  }, [expenses, q, category, status]);

  const overBudget = totals.budget > 0 && totals.spent > totals.budget;

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: EventExpense) {
    setEditing(row);
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-xl text-ink">Expenses</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => {
              void exportEventExpensesAction(eventId).then((file) => {
                if (file.success) window.location.href = file.url;
              });
            }}
          >
            Export xlsx
          </button>
          <button type="button" className={buttonClass("primary", "sm")} onClick={openCreate}>
            Add expense
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricTile
          label="Budget"
          value={formatCurrency(totals.budget, currency)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricTile
          label="Spent"
          value={formatCurrency(totals.spent, currency)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricTile
          label="Remaining"
          value={formatCurrency(totals.remaining, currency)}
          icon={<Wallet className="h-4 w-4" />}
          sublabel={overBudget ? "Over budget" : undefined}
        />
      </section>

      {overBudget ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Spent exceeds the event budget by {formatCurrency(totals.spent - totals.budget, currency)}
          .
        </p>
      ) : null}

      <form
        action={budgetAction}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-4"
      >
        <input type="hidden" name="eventId" value={eventId} />
        <div>
          <label className={labelClass} htmlFor="budget-total">
            Event budget
          </label>
          <input
            id="budget-total"
            name="budgetTotal"
            inputMode="decimal"
            defaultValue={budgetTotal ?? ""}
            className={`${fieldClass} mt-1 w-40`}
            placeholder="0"
          />
        </div>
        <SubmitButton className={buttonClass("secondary", "sm")}>Save budget</SubmitButton>
        {budgetState?.error ? <FormFeedback error={budgetState.error} /> : null}
        {budgetState?.success ? <FormFeedback success="Budget updated." /> : null}
      </form>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className={`${fieldClass} max-w-xs`}
        />
        <select
          className={fieldClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {[...new Set([...EXPENSE_CATEGORIES, ...expenses.map((e) => e.category)])].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {EXPENSE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="No expenses yet"
          description="Track vendor costs, printing, food, and more. Totals come from the database."
          action={
            <button type="button" className={buttonClass("primary", "sm")} onClick={openCreate}>
              Add expense
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{row.title}</p>
                <p className="text-xs text-ink-soft">
                  {row.category} · {row.kind} · {formatCurrency(row.amount, currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={row.status === "paid" ? "confirmed" : "pending"}
                  label={row.status}
                  size="sm"
                />
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={() => openEdit(row)}
                >
                  Edit
                </button>
                <form action={deleteEventExpenseAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className={buttonClass("destructive", "sm")}>
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totals.byCategory.length ? (
        <div className="rounded-xl border border-line bg-paper p-4">
          <p className={labelClass}>By category (from SQL)</p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {totals.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between gap-4">
                <span>{c.category}</span>
                <span className="tabular-nums">{formatCurrency(c.spent, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit expense" : "Add expense"}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton form="expense-form" className={buttonClass("primary", "sm")}>
              Save
            </SubmitButton>
          </div>
        }
      >
        <form id="expense-form" action={saveAction} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <input
            type="hidden"
            name="externalVendorId"
            value={editing?.externalVendorId || prefillVendorId || ""}
          />
          {saveState?.error ? <FormFeedback error={saveState.error} /> : null}
          <div>
            <label className={labelClass} htmlFor="ex-title">
              Title
            </label>
            <input
              id="ex-title"
              name="title"
              required
              defaultValue={editing?.title}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="ex-amount">
                Amount
              </label>
              <input
                id="ex-amount"
                name="amount"
                required
                inputMode="decimal"
                defaultValue={editing?.amount ?? ""}
                className={`${fieldClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="ex-category">
                Category
              </label>
              <input
                id="ex-category"
                name="category"
                list="expense-cats"
                defaultValue={editing?.category || (prefillVendorId ? "Vendor" : "Other")}
                className={`${fieldClass} mt-1`}
              />
              <datalist id="expense-cats">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="ex-kind">
                Kind
              </label>
              <select
                id="ex-kind"
                name="kind"
                defaultValue={editing?.kind || "expense"}
                className={`${fieldClass} mt-1`}
              >
                {EXPENSE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ex-status">
                Status
              </label>
              <select
                id="ex-status"
                name="status"
                defaultValue={editing?.status || "planned"}
                className={`${fieldClass} mt-1`}
              >
                {EXPENSE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="ex-paid">
              Paid on
            </label>
            <input
              id="ex-paid"
              name="paidOn"
              type="date"
              defaultValue={editing?.paidOn || ""}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ex-desc">
              Description
            </label>
            <textarea
              id="ex-desc"
              name="description"
              rows={3}
              defaultValue={editing?.description}
              className={`${fieldClass} mt-1`}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
