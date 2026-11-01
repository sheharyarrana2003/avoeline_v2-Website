import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { EventExpense, ExpenseKind, ExpenseStatus, ExpenseTotals } from "./types";

function mapExpense(row: Record<string, unknown>): EventExpense {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    category: String(row.category || "Other"),
    amount: Number(row.amount ?? 0),
    kind: (row.kind === "credit" ? "credit" : "expense") as ExpenseKind,
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

const EXPENSE_COLS =
  "id, event_id, title, description, category, amount, kind, status, paid_on, booking_id, external_vendor_id, receipt_path, created_by, created_at, updated_at";

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

export const getEventExpenseTotals = cache(async (eventId: string): Promise<ExpenseTotals> => {
  const empty: ExpenseTotals = { budget: 0, spent: 0, remaining: 0, byCategory: [] };
  if (!eventId) return empty;
  const { data, error } = await supabaseAdmin.rpc("event_expense_totals", { p_event_id: eventId });
  if (error) throw error;
  const rows = (data ?? []) as {
    budget: number;
    spent: number;
    remaining: number;
    category: string;
    category_spent: number;
  }[];
  if (!rows.length) {
    const { data: ev } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("budget_total")
      .eq("id", eventId)
      .maybeSingle();
    const budget = Number(ev?.budget_total ?? 0);
    return { budget, spent: 0, remaining: budget, byCategory: [] };
  }
  const first = rows[0]!;
  const byCategory = rows
    .filter((r) => r.category)
    .map((r) => ({ category: r.category, spent: Number(r.category_spent ?? 0) }));
  return {
    budget: Number(first.budget ?? 0),
    spent: Number(first.spent ?? 0),
    remaining: Number(first.remaining ?? 0),
    byCategory,
  };
});

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
