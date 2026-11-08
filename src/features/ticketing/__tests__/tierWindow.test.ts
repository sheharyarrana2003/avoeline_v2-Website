import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seatsLeftOf, tierWindowClosed } from "../tierWindow.logic";

describe("tierWindow / seatsLeft", () => {
  it("computes seats left when tracked", () => {
    assert.equal(seatsLeftOf(null, 5), null);
    assert.equal(seatsLeftOf(10, 3), 7);
    assert.equal(seatsLeftOf(2, 5), 0);
  });

  it("detects closed availability window", () => {
    assert.equal(tierWindowClosed(null), false);
    assert.equal(tierWindowClosed("1999-01-01T00:00:00.000Z"), true);
    assert.equal(tierWindowClosed("2999-01-01T00:00:00.000Z"), false);
  });
});
