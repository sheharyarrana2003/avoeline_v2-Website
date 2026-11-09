import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hackathonTeamCodesVisible } from "../roster";
import type { Registration } from "@/src/services/models/reg.type";

function lead(opts: {
  status: Registration["status"];
  paymentStatus?: Registration["payment"]["paymentStatus"];
}): Registration {
  return {
    registrationId: "r1",
    eventId: "e1",
    userId: "",
    attendee: { name: "A", email: "a@x.com", phone: "" },
    organizerId: "o1",
    registrationDate: "2026-01-01",
    registrationSource: "web",
    status: opts.status,
    statusHistory: [],
    payment: {
      paymentId: "",
      amountPaid: 0,
      currency: "PKR",
      paymentMethod: "bank_transfer",
      paymentStatus: opts.paymentStatus ?? "pending",
      transactionId: null,
      invoiceUrl: null,
      proofPath: null,
    },
    pricingTier: "General",
    tier: "General",
    waitlistPosition: 0,
    inviteId: null,
    customResponses: {},
    checkIn: {
      checkedIn: false,
      checkInTime: null,
      checkInMethod: null,
      checkedInBy: null,
      deviceId: null,
    },
  } as unknown as Registration;
}

describe("hackathonTeamCodesVisible", () => {
  it("hides codes until registration is confirmed", () => {
    assert.equal(
      hackathonTeamCodesVisible({ payment: "not_required" }, lead({ status: "pending" })),
      false,
    );
  });

  it("shows codes when free / not_required and confirmed", () => {
    assert.equal(
      hackathonTeamCodesVisible({ payment: "not_required" }, lead({ status: "confirmed" })),
      true,
    );
  });

  it("requires fee paid or payment completed when fee applies", () => {
    assert.equal(
      hackathonTeamCodesVisible(
        { payment: "fee_pending", feeStatus: "fee_pending" },
        lead({ status: "confirmed", paymentStatus: "pending" }),
      ),
      false,
    );
    assert.equal(
      hackathonTeamCodesVisible(
        { payment: "fee_paid", feeStatus: "fee_paid" },
        lead({ status: "confirmed", paymentStatus: "completed" }),
      ),
      true,
    );
  });

  it("hides codes for cancelled or eliminated teams", () => {
    assert.equal(
      hackathonTeamCodesVisible(
        { payment: "not_required", cancelled: true },
        lead({ status: "confirmed" }),
      ),
      false,
    );
    assert.equal(
      hackathonTeamCodesVisible(
        { payment: "not_required", eliminated: true },
        lead({ status: "confirmed" }),
      ),
      false,
    );
    assert.equal(
      hackathonTeamCodesVisible({ payment: "not_required" }, lead({ status: "cancelled" })),
      false,
    );
  });
});
