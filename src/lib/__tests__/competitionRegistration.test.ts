import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  competitionRegisterState,
  effectiveRegistrationClosesAt,
} from "../competitionRegistration";

describe("effectiveRegistrationClosesAt", () => {
  it("prefers track close when set", () => {
    assert.equal(
      effectiveRegistrationClosesAt("2026-12-01T12:00:00.000Z", "2026-12-31"),
      "2026-12-01T12:00:00.000Z",
    );
  });

  it("falls back to event close", () => {
    const out = effectiveRegistrationClosesAt(null, "2026-12-31");
    assert.ok(out);
    assert.equal(new Date(out!).getUTCFullYear(), 2026);
  });

  it("returns null when neither is set", () => {
    assert.equal(effectiveRegistrationClosesAt("", null), null);
  });
});

describe("competitionRegisterState", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("is closed when event lifecycle inactive", () => {
    assert.equal(
      competitionRegisterState({
        effectiveClosesAt: "2026-12-01T00:00:00.000Z",
        eventLifecycleActive: false,
        seatsLeft: 10,
        waitlistEnabled: false,
        now,
      }),
      "closed",
    );
  });

  it("is closed when past effective close", () => {
    assert.equal(
      competitionRegisterState({
        effectiveClosesAt: "2026-06-01T00:00:00.000Z",
        eventLifecycleActive: true,
        seatsLeft: 10,
        waitlistEnabled: false,
        now,
      }),
      "closed",
    );
  });

  it("is full when seats are gone and waitlist off", () => {
    assert.equal(
      competitionRegisterState({
        effectiveClosesAt: "2026-12-01T00:00:00.000Z",
        eventLifecycleActive: true,
        seatsLeft: 0,
        waitlistEnabled: false,
        now,
      }),
      "full",
    );
  });

  it("is open when seats remain", () => {
    assert.equal(
      competitionRegisterState({
        effectiveClosesAt: "2026-12-01T00:00:00.000Z",
        eventLifecycleActive: true,
        seatsLeft: 3,
        waitlistEnabled: false,
        now,
      }),
      "open",
    );
  });
});
