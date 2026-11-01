/**
 * Guardrail: TS status unions must match Postgres CHECK constraints.
 * Values are mirrored from `pg_get_constraintdef` as of schema opt Step 6.
 * After changing a CHECK, update the expected set here and run typecheck.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors `events_status_check` */
const EVENTS_STATUS = new Set(["draft", "published", "archived", "cancelled"]);

/** Mirrors `registrations_status_check` */
const REGISTRATIONS_STATUS = new Set([
  "awaiting_payment",
  "pending_approval",
  "registered",
  "checked_in",
  "cancelled",
  "waitlisted",
  "rejected",
]);

/** Mirrors `registrations_payment_status_check` */
const PAYMENT_STATUS = new Set(["free", "pending", "paid", "failed"]);

/** Mirrors `bookings_status_check` */
const BOOKINGS_STATUS = new Set([
  "quote_requested",
  "quote_sent",
  "quote_accepted",
  "confirmed",
  "completed",
  "cancelled",
]);

/** Mirrors `vendor_profiles_status_check` */
const VENDOR_STATUS = new Set(["pending", "approved", "suspended", "rejected"]);

/** Mirrors `certificates_status_check` */
const CERTIFICATE_STATUS = new Set(["issued", "revoked"]);

type EventStatus = "draft" | "published" | "archived" | "cancelled";
type RegistrationStatus =
  | "awaiting_payment"
  | "pending_approval"
  | "registered"
  | "checked_in"
  | "cancelled"
  | "waitlisted"
  | "rejected";
type PaymentStatus = "free" | "pending" | "paid" | "failed";
type BookingStatus =
  "quote_requested" | "quote_sent" | "quote_accepted" | "confirmed" | "completed" | "cancelled";
type VendorStatus = "pending" | "approved" | "suspended" | "rejected";
type CertificateStatus = "issued" | "revoked";

function assertUnionMatchesDb<T extends string>(
  label: string,
  union: readonly T[],
  db: Set<string>,
) {
  const ts = new Set(union);
  for (const v of ts) {
    assert.ok(db.has(v), `${label}: TS value "${v}" missing from DB CHECK`);
  }
  for (const v of db) {
    assert.ok(ts.has(v as T), `${label}: DB value "${v}" missing from TS union`);
  }
}

describe("status unions vs Postgres CHECKs", () => {
  it("events.status", () => {
    const ts = [
      "draft",
      "published",
      "archived",
      "cancelled",
    ] as const satisfies readonly EventStatus[];
    assertUnionMatchesDb("events.status", ts, EVENTS_STATUS);
  });

  it("registrations.status", () => {
    const ts = [
      "awaiting_payment",
      "pending_approval",
      "registered",
      "checked_in",
      "cancelled",
      "waitlisted",
      "rejected",
    ] as const satisfies readonly RegistrationStatus[];
    assertUnionMatchesDb("registrations.status", ts, REGISTRATIONS_STATUS);
  });

  it("registrations.payment_status", () => {
    const ts = ["free", "pending", "paid", "failed"] as const satisfies readonly PaymentStatus[];
    assertUnionMatchesDb("payment_status", ts, PAYMENT_STATUS);
  });

  it("bookings.status", () => {
    const ts = [
      "quote_requested",
      "quote_sent",
      "quote_accepted",
      "confirmed",
      "completed",
      "cancelled",
    ] as const satisfies readonly BookingStatus[];
    assertUnionMatchesDb("bookings.status", ts, BOOKINGS_STATUS);
  });

  it("vendor_profiles.status", () => {
    const ts = [
      "pending",
      "approved",
      "suspended",
      "rejected",
    ] as const satisfies readonly VendorStatus[];
    assertUnionMatchesDb("vendor.status", ts, VENDOR_STATUS);
  });

  it("certificates.status", () => {
    const ts = ["issued", "revoked"] as const satisfies readonly CertificateStatus[];
    assertUnionMatchesDb("certificates.status", ts, CERTIFICATE_STATUS);
  });
});
