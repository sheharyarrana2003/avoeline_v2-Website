import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampKeysetLimit, decodeKeysetCursor, encodeKeysetCursor } from "./keyset";

describe("keyset", () => {
  it("clamps limits", () => {
    assert.equal(clampKeysetLimit(3), 3);
    assert.equal(clampKeysetLimit(999), 50);
    assert.equal(clampKeysetLimit("x"), 25);
  });

  it("round-trips cursors", () => {
    const enc = encodeKeysetCursor({ at: "2026-10-12T00:00:00.000Z", id: "abc" });
    const dec = decodeKeysetCursor(enc);
    assert.deepEqual(dec, { at: "2026-10-12T00:00:00.000Z", id: "abc" });
    assert.equal(decodeKeysetCursor("nope"), null);
  });
});
