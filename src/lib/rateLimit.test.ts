import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __resetRateLimitForTests, rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    __resetRateLimitForTests();
    assert.equal(rateLimit("t:a", 2, 60).ok, true);
    assert.equal(rateLimit("t:a", 2, 60).ok, true);
    const blocked = rateLimit("t:a", 2, 60);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
  });

  it("tracks keys independently", () => {
    __resetRateLimitForTests();
    assert.equal(rateLimit("t:b", 1, 60).ok, true);
    assert.equal(rateLimit("t:c", 1, 60).ok, true);
    assert.equal(rateLimit("t:b", 1, 60).ok, false);
  });
});
