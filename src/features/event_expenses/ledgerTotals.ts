import type { LedgerLine, LedgerTotals } from "./types";

/**
 * Pure mirror of `event_ledger_totals` SQL (excluding category rows aggregation
 * shape slightly — categories collected from non-superseded expense lines).
 */
export function computeLedgerTotals(lines: LedgerLine[], budget = 0): LedgerTotals {
  const active = lines.filter((l) => !l.superseded);
  let incomeReceived = 0;
  let incomeExpected = 0;
  let expensesPaid = 0;
  let expensesPlanned = 0;
  const cat = new Map<string, { budget: number; actual: number }>();

  for (const line of active) {
    if (
      line.direction === "income" &&
      line.status === "received" &&
      line.source !== "auto_sponsor_expected"
    ) {
      incomeReceived += line.amount;
    }
    if (
      line.source === "auto_sponsor_expected" ||
      line.source === "auto_ticket" ||
      line.source === "auto_competition" ||
      (line.source === "manual" && line.direction === "income")
    ) {
      incomeExpected += line.amount;
    }
    if (line.direction === "expense" && line.status === "paid") {
      expensesPaid += line.amount;
      const row = cat.get(line.category) ?? { budget: 0, actual: 0 };
      row.actual += line.amount;
      cat.set(line.category, row);
    }
    if (line.direction === "expense" && line.status === "planned") {
      expensesPlanned += line.amount;
      const row = cat.get(line.category) ?? { budget: 0, actual: 0 };
      row.budget += line.amount;
      cat.set(line.category, row);
    }
  }

  return {
    incomeReceived,
    incomeExpected,
    expensesPaid,
    expensesPlanned,
    net: incomeReceived - expensesPaid,
    projectedNet: incomeExpected - (expensesPaid + expensesPlanned),
    budget,
    byCategory: [...cat.entries()].map(([category, v]) => ({
      category,
      budget: v.budget,
      actual: v.actual,
    })),
  };
}

/** Mark auto booking / own-vendor lines superseded when a manual expense links them. */
export function applySupersededFlags(lines: LedgerLine[]): LedgerLine[] {
  const linkedBookings = new Set(
    lines
      .filter((l) => l.source === "manual" && l.direction === "expense" && l.bookingId)
      .map((l) => l.bookingId as string),
  );
  const linkedVendors = new Set(
    lines
      .filter((l) => l.source === "manual" && l.direction === "expense" && l.externalVendorId)
      .map((l) => l.externalVendorId as string),
  );
  return lines.map((line) => {
    if (line.source === "auto_booking" && line.bookingId && linkedBookings.has(line.bookingId)) {
      return { ...line, superseded: true };
    }
    if (
      line.source === "auto_own_vendor" &&
      line.externalVendorId &&
      linkedVendors.has(line.externalVendorId)
    ) {
      return { ...line, superseded: true };
    }
    return line;
  });
}
