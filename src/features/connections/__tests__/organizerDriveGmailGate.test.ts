import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyOrganizerDriveGmail,
  organizerDriveGmailMessage,
} from "../lib/organizerDriveGmailGate.logic";

describe("classifyOrganizerDriveGmail", () => {
  it("allows when both caps present", () => {
    assert.equal(classifyOrganizerDriveGmail({ hasDrive: true, hasGmail: true }), "OK");
  });
  it("codes missing drive / gmail / both", () => {
    assert.equal(classifyOrganizerDriveGmail({ hasDrive: false, hasGmail: true }), "NO_DRIVE");
    assert.equal(classifyOrganizerDriveGmail({ hasDrive: true, hasGmail: false }), "NO_GMAIL");
    assert.equal(classifyOrganizerDriveGmail({ hasDrive: false, hasGmail: false }), "NO_BOTH");
  });
  it("messages mention Connections", () => {
    assert.match(organizerDriveGmailMessage("NO_BOTH"), /Connections/);
  });
});
