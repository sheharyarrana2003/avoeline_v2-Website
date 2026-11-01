import assert from "node:assert/strict";
import { isBooked, vendorNetValue, grossValue } from "./bookingValue";
import type { BookingData } from "./types";

const base = {
  bookingId: "b1",
  eventId: "e1",
  vendorId: "v1",
  organizerId: "o1",
  serviceType: "catering",
  serviceId: "s1",
  status: "quote_accepted",
  requirements: {} as BookingData["requirements"],
  quote: { vendorQuote: { totalAmount: 50000 } },
  payment: { totalAmount: 50000, commission: { vendorReceives: 45000 } },
} as unknown as BookingData;

assert.equal(isBooked(base), true);
assert.equal(isBooked({ ...base, status: "quote_requested" }), false);
assert.equal(vendorNetValue(base), 45000);
assert.equal(grossValue(base), 50000);
console.log("bookingValue.test.ts: ok");
