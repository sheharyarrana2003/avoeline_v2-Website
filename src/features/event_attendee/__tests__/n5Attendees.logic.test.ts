import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registrantIdentity } from "../registrantIdentity";
import {
  approveDisabledReason,
  paymentProofPlatformUrl,
  storedFileIdFromProofPath,
} from "../approveDisabledReason";
import { importAttendeesAllowed, PAID_IMPORT_TOOLTIP } from "../importGate";
import { attendeeColumns } from "@/src/features/exports/eventSheets";
import { registrationMatchesFilters, readRosterFilters } from "../roster";
import type { Registration } from "@/src/services/models/reg.type";

function bareReg(
  partial: Partial<Registration> & { attendee?: Registration["attendee"] },
): Registration {
  return {
    registrationId: "11111111-1111-1111-1111-111111111111",
    eventId: "22222222-2222-2222-2222-222222222222",
    userId: "33333333-3333-3333-3333-333333333333",
    status: "pending",
    attendee: { name: "", email: "", phone: "" },
    payment: { paymentStatus: "pending", amountPaid: 0, currency: "PKR", paymentMethod: "bank" },
    checkIn: { checkedIn: false },
    customResponses: {},
    statusHistory: [],
    createdAt: new Date().toISOString(),
    ...partial,
  } as Registration;
}

describe("N5 registrantIdentity", () => {
  it("prefers registration snapshot over linked organizer account", () => {
    const reg = bareReg({
      attendee: { name: "Registrant Snap", email: "snap@example.com", phone: "111" },
    });
    const user = {
      email: "organizer@example.com",
      profile: { fullName: "Organizer Account", phoneNumber: "999" },
    };
    const id = registrantIdentity(reg, user as never);
    assert.equal(id.name, "Registrant Snap");
    assert.equal(id.email, "snap@example.com");
    assert.equal(id.phone, "111");
  });

  it("falls back to user when snapshot fields are empty", () => {
    const reg = bareReg({ attendee: { name: "", email: "", phone: "" } });
    const user = {
      email: "organizer@example.com",
      profile: { fullName: "Organizer Account", phoneNumber: "999" },
    };
    const id = registrantIdentity(reg, user as never);
    assert.equal(id.name, "Organizer Account");
    assert.equal(id.email, "organizer@example.com");
    assert.equal(id.phone, "999");
  });
});

describe("N5 approveDisabledReason", () => {
  it("blocks paid pending without proof", () => {
    assert.equal(
      approveDisabledReason({
        isPaid: true,
        status: "pending",
        proofPath: "",
        paymentStatus: "pending",
      }),
      "No payment proof yet",
    );
  });

  it("allows free pending and paid with proof", () => {
    assert.equal(
      approveDisabledReason({
        isPaid: false,
        status: "pending",
        proofPath: "",
        paymentStatus: "pending",
      }),
      null,
    );
    assert.equal(
      approveDisabledReason({
        isPaid: true,
        status: "pending",
        proofPath: "file:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        paymentStatus: "pending",
      }),
      null,
    );
  });
});

describe("N5 payment proof URLs", () => {
  it("builds /api/files/{id} for file: refs", () => {
    const id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    assert.equal(paymentProofPlatformUrl(`file:${id}`), `/api/files/${id}`);
    assert.equal(storedFileIdFromProofPath(`file:${id}`), id);
    assert.equal(storedFileIdFromProofPath(`/api/files/${id}`), id);
  });
});

describe("N5 import gate", () => {
  it("allows free only with paid tooltip", () => {
    assert.equal(importAttendeesAllowed(true), true);
    assert.equal(importAttendeesAllowed(false), false);
    assert.match(PAID_IMPORT_TOOLTIP, /payments can be verified/i);
  });
});

describe("N5 export columns", () => {
  it("includes ticket and proof URL headers", () => {
    const cols = attendeeColumns([]);
    const headers = cols.map((c) => c.header);
    assert.ok(headers.includes("Short code"));
    assert.ok(headers.includes("Ticket URL"));
    assert.ok(headers.includes("Payment proof (platform)"));
    assert.ok(headers.includes("Payment proof (Drive)"));
  });
});

describe("N5 roster short code search", () => {
  it("matches short code needles", () => {
    const filters = readRosterFilters(new URLSearchParams("q=AB12CD"));
    const row = {
      register: bareReg({
        shortCode: "AB12CD",
        attendee: { name: "X", email: "x@y.z", phone: "" },
      }),
      user: undefined,
    };
    assert.equal(registrationMatchesFilters(row, filters), true);
  });
});
