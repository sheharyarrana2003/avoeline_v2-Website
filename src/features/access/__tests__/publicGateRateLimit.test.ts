import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __resetRateLimitForTests, rateLimit } from "@/src/lib/rateLimit";

/** Same key shape as publicEvent.service public-gate probes. */
function publicGateKey(eventId: string, viewer: string) {
  return `public-gate:${eventId}:${viewer}`;
}

describe("public-gate rate limit key", () => {
  it("isolates per event and viewer", () => {
    __resetRateLimitForTests();
    const a = publicGateKey("e1", "anon");
    const b = publicGateKey("e1", "user-2");
    assert.equal(rateLimit(a, 1, 60).ok, true);
    assert.equal(rateLimit(a, 1, 60).ok, false);
    assert.equal(rateLimit(b, 1, 60).ok, true);
  });
});
