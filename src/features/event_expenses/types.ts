export const EXPENSE_CATEGORIES = [
  "Vendor",
  "Stationery",
  "Food",
  "Transport",
  "Printing",
  "Venue",
  "Marketing",
  "Other",
] as const;

export const EXPENSE_STATUSES = ["planned", "paid"] as const;
export const EXPENSE_KINDS = ["expense", "credit", "income"] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

export type EventExpense = {
  id: string;
  eventId: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  kind: ExpenseKind;
  status: ExpenseStatus;
  paidOn: string | null;
  bookingId: string | null;
  externalVendorId: string | null;
  receiptPath: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LedgerDirection = "income" | "expense";
export type LedgerLineStatus = "received" | "expected" | "paid" | "planned";
export type LedgerSource =
  | "auto_ticket"
  | "auto_competition"
  | "auto_sponsor_expected"
  | "auto_sponsor_received"
  | "auto_booking"
  | "auto_own_vendor"
  | "manual";

export type LedgerLine = {
  lineId: string;
  eventId: string;
  source: LedgerSource | string;
  direction: LedgerDirection;
  status: LedgerLineStatus | string;
  amount: number;
  category: string;
  title: string;
  sourcePath: string | null;
  bookingId: string | null;
  externalVendorId: string | null;
  manualExpenseId: string | null;
  sponsorId: string | null;
  superseded: boolean;
  createdAt: string | null;
};

export type LedgerTotals = {
  incomeReceived: number;
  incomeExpected: number;
  expensesPaid: number;
  expensesPlanned: number;
  net: number;
  projectedNet: number;
  budget: number;
  byCategory: { category: string; budget: number; actual: number }[];
};

/** @deprecated Prefer LedgerTotals — kept for gradual call-site migration. */
export type ExpenseTotals = {
  budget: number;
  spent: number;
  remaining: number;
  registrationRevenue: number;
  byCategory: { category: string; spent: number }[];
};
