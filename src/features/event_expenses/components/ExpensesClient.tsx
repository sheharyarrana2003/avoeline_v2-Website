"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
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
  type LedgerLine,
  type LedgerTotals,
} from "../types";

function resolveLedgerSourcePath(sourcePath: string | null, organizerId: string): string | null {
  if (!sourcePath) return null;
  return sourcePath.replace("/organizer/_/", `/organizer/${organizerId}/`);
}

function statusTone(status: string): "confirmed" | "pending" | "cancelled" {
  if (status === "paid" || status === "received") return "confirmed";
  if (status === "planned" || status === "expected") return "pending";
  return "cancelled";
}

export function ExpensesClient({
  eventId,
  organizerId,
  lines,
  expenses,
  totals,
  budgetTotal,
  prefillVendorId,
  currency = "PKR",
}: {
  eventId: string;
  organizerId: string;
  lines: LedgerLine[];
  expenses: EventExpense[];
  totals: LedgerTotals;
  budgetTotal: number | null;
  prefillVendorId?: string | null;
  currency?: string;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
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

  const expensesById = useMemo(() => {
    const map = new Map<string, EventExpense>();
    for (const e of expenses) map.set(e.id, e);
    return map;
  }, [expenses]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return lines.filter((line) => {
      if (category !== "all" && line.category !== category) return false;
      if (direction !== "all" && line.direction !== direction) return false;
      if (status !== "all" && line.status !== status) return false;
      if (sourceFilter === "auto" && line.source === "manual") return false;
      if (sourceFilter === "manual" && line.source !== "manual") return false;
      if (!needle) return true;
      return [line.title, line.category, line.source].join(" ").toLowerCase().includes(needle);
    });
  }, [lines, q, category, direction, status, sourceFilter]);

  const overBudget = totals.budget > 0 && totals.expensesPaid > totals.budget;
  const categories = [...new Set([...EXPENSE_CATEGORIES, ...lines.map((l) => l.category)])];

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEditManual(line: LedgerLine) {
    if (!line.manualExpenseId) return;
    const row = expensesById.get(line.manualExpenseId);
    if (!row) return;
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
            Add entry
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          label="Income received"
          value={formatCurrency(totals.incomeReceived, currency)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricTile
          label="Income expected"
          value={formatCurrency(totals.incomeExpected, currency)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricTile
          label="Expenses paid"
          value={formatCurrency(totals.expensesPaid, currency)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricTile
          label="Expenses planned"
          value={formatCurrency(totals.expensesPlanned, currency)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricTile
          label="Net"
          value={formatCurrency(totals.net, currency)}
          icon={<Wallet className="h-4 w-4" />}
          sublabel="Received − paid"
        />
        <MetricTile
          label="Projected net"
          value={formatCurrency(totals.projectedNet, currency)}
          icon={<Wallet className="h-4 w-4" />}
          sublabel="Expected − (paid + planned)"
        />
      </section>

      {overBudget ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Paid expenses exceed the event budget by{" "}
          {formatCurrency(totals.expensesPaid - totals.budget, currency)}.
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
          placeholder="Search ledger"
          className={`${fieldClass} max-w-xs`}
        />
        <select
          className={fieldClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          <option value="all">Income + expense</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="received">received</option>
          <option value="expected">expected</option>
          <option value="paid">paid</option>
          <option value="planned">planned</option>
        </select>
        <select
          className={fieldClass}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">Auto + manual</option>
          <option value="auto">Automatic only</option>
          <option value="manual">Manual only</option>
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="No ledger lines yet"
          description="Automatic ticket, sponsor, vendor, and competition rows appear here alongside manual entries."
          action={
            <button type="button" className={buttonClass("primary", "sm")} onClick={openCreate}>
              Add entry
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
          {filtered.map((line) => {
            const href = resolveLedgerSourcePath(line.sourcePath, organizerId);
            const isManual = line.source === "manual" && !!line.manualExpenseId;
            return (
              <li
                key={line.lineId}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  line.superseded ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{line.title}</p>
                  <p className="text-xs text-ink-soft">
                    {line.category} · {line.source} · {line.direction} ·{" "}
                    {formatCurrency(line.amount, currency)}
                    {line.superseded ? " · superseded by manual" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={statusTone(line.status)} label={line.status} size="sm" />
                  {href ? (
                    <Link href={href} className={buttonClass("ghost", "sm")}>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Source
                    </Link>
                  ) : null}
                  {isManual ? (
                    <>
                      <button
                        type="button"
                        className={buttonClass("secondary", "sm")}
                        onClick={() => openEditManual(line)}
                      >
                        Edit
                      </button>
                      <form action={deleteEventExpenseAction}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="id" value={line.manualExpenseId!} />
                        <button type="submit" className={buttonClass("destructive", "sm")}>
                          Delete
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totals.byCategory.length ? (
        <div className="rounded-xl border border-line bg-paper p-4">
          <p className={labelClass}>Expenses by category</p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {totals.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between gap-4">
                <span>{c.category}</span>
                <span className="tabular-nums">
                  {formatCurrency(c.actual, currency)} paid / {formatCurrency(c.budget, currency)}{" "}
                  planned
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit entry" : "Add entry"}
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
          <input type="hidden" name="bookingId" value={editing?.bookingId || ""} />
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
              <p className="mt-1 text-xs text-ink-soft">
                Status applies to expenses; income and credit count as received.
              </p>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="ex-paid">
              Paid / received on
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
