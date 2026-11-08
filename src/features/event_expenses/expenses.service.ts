import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { EventExpense, ExpenseKind, ExpenseStatus, LedgerLine, LedgerTotals } from "./types";

function mapKind(raw: unknown): ExpenseKind {
  if (raw === "credit" || raw === "income") return raw;
  return "expense";
}

function mapExpense(row: Record<string, unknown>): EventExpense {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    category: String(row.category || "Other"),
    amount: Number(row.amount ?? 0),
    kind: mapKind(row.kind),
    status: (row.status === "paid" ? "paid" : "planned") as ExpenseStatus,
    paidOn: row.paid_on ? String(row.paid_on) : null,
    bookingId: row.booking_id ? String(row.booking_id) : null,
    externalVendorId: row.external_vendor_id ? String(row.external_vendor_id) : null,
    receiptPath: row.receipt_path ? String(row.receipt_path) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapLedgerLine(row: Record<string, unknown>): LedgerLine {
  return {
    lineId: String(row.line_id),
    eventId: String(row.event_id),
    source: String(row.source || ""),
    direction: row.direction === "expense" ? "expense" : "income",
    status: String(row.status || ""),
    amount: Number(row.amount ?? 0),
    category: String(row.category || "Other"),
    title: String(row.title || ""),
    sourcePath: row.source_path ? String(row.source_path) : null,
    bookingId: row.booking_id ? String(row.booking_id) : null,
    externalVendorId: row.external_vendor_id ? String(row.external_vendor_id) : null,
    manualExpenseId: row.manual_expense_id ? String(row.manual_expense_id) : null,
    sponsorId: row.sponsor_id ? String(row.sponsor_id) : null,
    superseded: !!row.superseded,
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

const EXPENSE_COLS =
  "id, event_id, title, description, category, amount, kind, status, paid_on, booking_id, external_vendor_id, receipt_path, created_by, created_at, updated_at";

const LEDGER_COLS =
  "line_id, event_id, source, direction, status, amount, category, title, source_path, booking_id, external_vendor_id, manual_expense_id, sponsor_id, superseded, created_at";

export const listEventExpenses = cache(async (eventId: string): Promise<EventExpense[]> => {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_EXPENSES)
    .select(EXPENSE_COLS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapExpense(r as Record<string, unknown>));
});

export const listEventLedgerLines = cache(async (eventId: string): Promise<LedgerLine[]> => {
  if (!eventId) return [];
  const { data, error } = await supabaseAdmin
    .from("event_ledger_lines")
    .select(LEDGER_COLS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapLedgerLine(r as Record<string, unknown>));
});

export const getEventLedgerTotals = cache(async (eventId: string): Promise<LedgerTotals> => {
  const empty: LedgerTotals = {
    incomeReceived: 0,
    incomeExpected: 0,
    expensesPaid: 0,
    expensesPlanned: 0,
    net: 0,
    projectedNet: 0,
    budget: 0,
    byCategory: [],
  };
  if (!eventId) return empty;
  const { data, error } = await supabaseAdmin.rpc("event_ledger_totals", {
    p_event_id: eventId,
  });
  if (error) throw error;
  const rows = (data ?? []) as {
    income_received: number;
    income_expected: number;
    expenses_paid: number;
    expenses_planned: number;
    net: number;
    projected_net: number;
    budget: number;
    category: string;
    category_budget: number;
    category_actual: number;
  }[];
  if (!rows.length) {
    const budget = (await getEventBudgetTotal(eventId)) ?? 0;
    return { ...empty, budget };
  }
  const first = rows[0]!;
  return {
    incomeReceived: Number(first.income_received ?? 0),
    incomeExpected: Number(first.income_expected ?? 0),
    expensesPaid: Number(first.expenses_paid ?? 0),
    expensesPlanned: Number(first.expenses_planned ?? 0),
    net: Number(first.net ?? 0),
    projectedNet: Number(first.projected_net ?? 0),
    budget: Number(first.budget ?? 0),
    byCategory: rows
      .filter((r) => r.category)
      .map((r) => ({
        category: r.category,
        budget: Number(r.category_budget ?? 0),
        actual: Number(r.category_actual ?? 0),
      })),
  };
});

/** @deprecated Use getEventLedgerTotals */
export const getEventExpenseTotals = getEventLedgerTotals;

export async function getEventBudgetTotal(eventId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("budget_total")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (data?.budget_total == null) return null;
  return Number(data.budget_total);
}

export async function signedReceiptUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from("expense-receipts")
    .createSignedUrl(path, 300);
  if (error) {
    console.error("[signedReceiptUrl]", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Resolve organizer-facing source path from ledger placeholder `/organizer/_/...`. */
export function resolveLedgerSourcePath(
  sourcePath: string | null,
  organizerId: string,
): string | null {
  if (!sourcePath) return null;
  return sourcePath.replace("/organizer/_/", `/organizer/${organizerId}/`);
}
