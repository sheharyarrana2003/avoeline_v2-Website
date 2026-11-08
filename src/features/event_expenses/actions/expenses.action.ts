"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { assertEventActor } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { checkPermission } from "@/src/features/permissions/permissions.service";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { deliverSheet } from "@/src/features/exports/writeSheet";
import { listEventLedgerLines } from "../expenses.service";
import type { ExpenseKind, LedgerLine } from "../types";

/** Owner/manager via assertEventActor, or staff with expenses:manage / page_expenses. */
async function assertExpensesManage(eventId: string) {
  const event = await assertEventActor(eventId, "expenses");
  if (!event) return null;
  const user = await AuthService.getCurrentUser();
  if (!user?.userId) return null;
  if (String(event.organizerId) === user.userId) return event;
  const mayManage = await checkPermission(user.userId, "expenses:manage");
  const mayPage = await checkPermission(user.userId, "page_expenses");
  if (mayManage || mayPage) return event;
  return event;
}

function parseKind(raw: string): ExpenseKind {
  if (raw === "credit" || raw === "income") return raw;
  return "expense";
}

export async function saveEventExpenseAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const event = await assertExpensesManage(eventId);
    if (!event) return fail("You cannot manage expenses for that event.");
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return fail("Title is required.");
    const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d.-]/g, ""));
    if (Number.isNaN(amount) || amount < 0) return fail("Amount must be a non-negative number.");
    const kind = parseKind(String(formData.get("kind") ?? "expense"));
    const status = String(formData.get("status") ?? "planned") === "paid" ? "paid" : "planned";
    const category = String(formData.get("category") ?? "Other").trim() || "Other";
    const id = String(formData.get("id") ?? "").trim();
    const user = await AuthService.getCurrentUser();
    const now = new Date().toISOString();
    const payload = {
      event_id: eventId,
      title,
      description: String(formData.get("description") ?? "").trim(),
      category,
      amount,
      kind,
      status: kind === "expense" ? status : "paid",
      paid_on: String(formData.get("paidOn") ?? "").trim() || null,
      booking_id: String(formData.get("bookingId") ?? "").trim() || null,
      external_vendor_id: String(formData.get("externalVendorId") ?? "").trim() || null,
      updated_at: now,
    };
    if (id) {
      const { error } = await supabaseAdmin
        .from(TABLES.EVENT_EXPENSES)
        .update(payload)
        .eq("id", id)
        .eq("event_id", eventId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from(TABLES.EVENT_EXPENSES).insert({
        id: randomUUID(),
        ...payload,
        receipt_path: null,
        created_by: user?.userId ?? null,
        created_at: now,
      });
      if (error) throw error;
    }
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/expenses`);
    return ok();
  } catch (err) {
    console.error("[saveEventExpenseAction]", err);
    return fail("Could not save that expense.");
  }
}

export async function deleteEventExpenseAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const event = await assertExpensesManage(eventId);
  if (!event || !id) return;
  await supabaseAdmin.from(TABLES.EVENT_EXPENSES).delete().eq("id", id).eq("event_id", eventId);
  revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/expenses`);
}

export async function setEventBudgetAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const event = await assertExpensesManage(eventId);
    if (!event) return fail("You cannot change the budget for that event.");
    const raw = String(formData.get("budgetTotal") ?? "").trim();
    const budget = raw === "" ? null : Number(raw);
    if (budget != null && (Number.isNaN(budget) || budget < 0))
      return fail("Budget must be non-negative.");
    const { error } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .update({ budget_total: budget })
      .eq("id", eventId);
    if (error) throw error;
    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/expenses`);
    return ok();
  } catch (err) {
    console.error("[setEventBudgetAction]", err);
    return fail("Could not update budget.");
  }
}

export async function exportEventExpensesAction(eventId: string) {
  const event = await assertEventActor(eventId, "expenses");
  if (!event) throw new Error("Unauthorized");
  const rows = await listEventLedgerLines(eventId);
  return deliverSheet<LedgerLine>(
    `event-${eventId}-ledger`,
    "xlsx",
    rows,
    [
      { header: "Title", value: (r) => r.title },
      { header: "Category", value: (r) => r.category },
      { header: "Source", value: (r) => r.source },
      { header: "Direction", value: (r) => r.direction },
      { header: "Amount", value: (r) => r.amount },
      { header: "Status", value: (r) => r.status },
      { header: "Superseded", value: (r) => (r.superseded ? "yes" : "") },
      { header: "Booking id", value: (r) => r.bookingId || "" },
      { header: "Manual id", value: (r) => r.manualExpenseId || "" },
    ],
    "Ledger",
  );
}
