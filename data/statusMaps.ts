/**
 * App DTO status ↔ Postgres check-constraint values.
 * Used at the service boundary so UI can keep existing labels while DB stays canonical.
 */

const REG_TO_DB: Record<string, string> = {
  pending: "pending_approval",
  pending_approval: "pending_approval",
  confirmed: "registered",
  registered: "registered",
  attended: "checked_in",
  checked_in: "checked_in",
  waitlisted: "waitlisted",
  cancelled: "cancelled",
  rejected: "cancelled",
  awaiting_payment: "pending_approval",
  no_show: "cancelled",
};

const REG_FROM_DB: Record<string, string> = {
  pending_approval: "pending",
  registered: "confirmed",
  checked_in: "checked_in",
  waitlisted: "waitlisted",
  cancelled: "cancelled",
};

const PAY_TO_DB: Record<string, string> = {
  completed: "paid",
  paid: "paid",
  pending: "pending",
  free: "free",
  failed: "failed",
  refunded: "failed",
};

const PAY_FROM_DB: Record<string, string> = {
  paid: "completed",
  pending: "pending",
  free: "free",
  failed: "failed",
};

export function regStatusToDb(status: string | null | undefined): string {
  const key = String(status ?? "").trim();
  return (REG_TO_DB[key] ?? key) || "registered";
}

export function regStatusFromDb(status: string | null | undefined): string {
  const key = String(status ?? "").trim();
  return REG_FROM_DB[key] ?? key;
}

export function payStatusToDb(status: string | null | undefined): string {
  const key = String(status ?? "").trim();
  return (PAY_TO_DB[key] ?? key) || "free";
}

export function payStatusFromDb(status: string | null | undefined): string {
  const key = String(status ?? "").trim();
  return PAY_FROM_DB[key] ?? key;
}
