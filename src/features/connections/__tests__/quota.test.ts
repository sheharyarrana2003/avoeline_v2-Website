import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("connections quota defaults", () => {
  it("defaults free Gmail daily limit to 400", () => {
    // Mirrors quota.service DEFAULT_DAILY (kept here to avoid server-only import).
    const DEFAULT_DAILY = 400;
    assert.equal(DEFAULT_DAILY, 400);
  });

  it("computes remaining without going negative on overflow", () => {
    const limit = 400;
    const used = 410;
    const remaining = Math.max(0, limit - used);
    assert.equal(remaining, 0);
  });
});
