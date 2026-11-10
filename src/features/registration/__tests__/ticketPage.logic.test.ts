import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  registrationDisplayCode,
  ticketCalendarAllowed,
  ticketHeroCopy,
  ticketHeroState,
  ticketShowsQr,
  whatHappensNextLine,
} from "../ticketPage.logic";

describe("ticket page N4 logic", () => {
  it("maps status heroes", () => {
    assert.equal(ticketHeroState("pending"), "awaiting_approval");
    assert.equal(ticketHeroState("confirmed"), "confirmed");
    assert.equal(ticketHeroState("checked_in"), "confirmed");
    assert.equal(ticketHeroState("rejected"), "rejected");
    assert.equal(ticketHeroCopy("pending", "Demo").title, "Awaiting approval");
    assert.equal(ticketHeroCopy("confirmed", "Demo").title, "Confirmed");
  });

  it("gates calendar and QR to confirmed family", () => {
    assert.equal(ticketCalendarAllowed("confirmed"), true);
    assert.equal(ticketCalendarAllowed("pending"), false);
    assert.equal(ticketCalendarAllowed("rejected"), false);
    assert.equal(ticketShowsQr("confirmed"), true);
    assert.equal(ticketShowsQr("awaiting_payment"), false);
  });

  it("what happens next and display code never prefer UUID", () => {
    assert.ok(whatHappensNextLine({ status: "pending", isFree: true, requiresApproval: true }));
    assert.equal(registrationDisplayCode("AVO-K7Q4M2"), "AVO-K7Q4M2");
    assert.equal(registrationDisplayCode(""), "—");
  });
});
