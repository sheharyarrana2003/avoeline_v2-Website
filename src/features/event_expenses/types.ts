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
export const EXPENSE_KINDS = ["expense", "credit"] as const;

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

export type ExpenseTotals = {
  budget: number;
  spent: number;
  remaining: number;
  byCategory: { category: string; spent: number }[];
};
