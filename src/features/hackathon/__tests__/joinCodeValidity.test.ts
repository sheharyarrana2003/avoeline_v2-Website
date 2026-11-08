import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinCodeValidUntilIso } from "../joinCodeValidity";

describe("joinCodeValidUntilIso", () => {
  it("picks the later of last phase close and event end", () => {
    const until = joinCodeValidUntilIso({
      eventEndsAtIso: "2026-11-10T18:00:00.000Z",
      phaseCloses: ["2026-11-12T12:00:00.000Z", "2026-11-08T12:00:00.000Z"],
    });
    assert.equal(until, "2026-11-12T12:00:00.000Z");
  });

  it("falls back to event end when phases are empty", () => {
    assert.equal(
      joinCodeValidUntilIso({
        eventEndsAtIso: "2026-11-10T18:00:00.000Z",
        phaseCloses: [],
      }),
      "2026-11-10T18:00:00.000Z",
    );
  });

  it("returns null when nothing is set", () => {
    assert.equal(joinCodeValidUntilIso({}), null);
  });
});
