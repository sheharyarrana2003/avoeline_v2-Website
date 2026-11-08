import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySupersededFlags, computeLedgerTotals } from "../ledgerTotals";
import type { LedgerLine } from "../types";

function line(
  partial: Partial<LedgerLine> &
    Pick<LedgerLine, "lineId" | "source" | "direction" | "status" | "amount">,
): LedgerLine {
  return {
    eventId: "e1",
    category: "Other",
    title: partial.lineId,
    sourcePath: null,
    bookingId: null,
    externalVendorId: null,
    manualExpenseId: null,
    sponsorId: null,
    superseded: false,
    createdAt: null,
    ...partial,
  };
}

describe("ledgerTotals", () => {
  it("sums auto + manual income and expenses", () => {
    const totals = computeLedgerTotals(
      [
        line({
          lineId: "t1",
          source: "auto_ticket",
          direction: "income",
          status: "received",
          amount: 100,
          category: "Tickets",
        }),
        line({
          lineId: "s1",
          source: "auto_sponsor_expected",
          direction: "income",
          status: "expected",
          amount: 500,
          category: "Sponsorships",
        }),
        line({
          lineId: "m1",
          source: "manual",
          direction: "income",
          status: "received",
          amount: 50,
        }),
        line({
          lineId: "e1",
          source: "manual",
          direction: "expense",
          status: "paid",
          amount: 40,
          category: "Food",
        }),
        line({
          lineId: "e2",
          source: "auto_booking",
          direction: "expense",
          status: "planned",
          amount: 200,
          category: "Vendor",
        }),
      ],
      1000,
    );
    assert.equal(totals.incomeReceived, 150);
    assert.equal(totals.incomeExpected, 650);
    assert.equal(totals.expensesPaid, 40);
    assert.equal(totals.expensesPlanned, 200);
    assert.equal(totals.net, 110);
    assert.equal(totals.projectedNet, 410);
    assert.equal(totals.budget, 1000);
  });

  it("does not double-count booking when manual expense links it", () => {
    const raw = [
      line({
        lineId: "b1",
        source: "auto_booking",
        direction: "expense",
        status: "planned",
        amount: 300,
        category: "Vendor",
        bookingId: "book-1",
      }),
      line({
        lineId: "m1",
        source: "manual",
        direction: "expense",
        status: "paid",
        amount: 280,
        category: "Vendor",
        bookingId: "book-1",
        manualExpenseId: "m1",
      }),
    ];
    const lines = applySupersededFlags(raw);
    assert.equal(lines[0]!.superseded, true);
    const totals = computeLedgerTotals(lines);
    assert.equal(totals.expensesPaid, 280);
    assert.equal(totals.expensesPlanned, 0);
  });

  it("keeps sponsor expected separate from received in incomeReceived", () => {
    const totals = computeLedgerTotals([
      line({
        lineId: "se",
        source: "auto_sponsor_expected",
        direction: "income",
        status: "expected",
        amount: 1000,
        category: "Sponsorships",
      }),
      line({
        lineId: "sr",
        source: "auto_sponsor_received",
        direction: "income",
        status: "received",
        amount: 400,
        category: "Sponsorships",
      }),
    ]);
    assert.equal(totals.incomeReceived, 400);
    assert.equal(totals.incomeExpected, 1000);
  });
});
