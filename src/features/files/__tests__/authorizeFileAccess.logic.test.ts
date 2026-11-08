import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors authorizeStoredFileAccess compete branch without cookies/DB. */
function competeMayAccess(opts: {
  category: string;
  eventId: string | null;
  competeEventId: string | null;
  teamOnEvent: boolean;
}): boolean {
  const allowed = new Set(["hackathon_phase", "hackathon_task", "hackathon_submission"]);
  if (!opts.eventId || !allowed.has(opts.category)) return false;
  if (!opts.competeEventId || opts.competeEventId !== opts.eventId) return false;
  return opts.teamOnEvent;
}

describe("authorizeStoredFileAccess compete categories", () => {
  it("allows compete team for hackathon categories on same event", () => {
    assert.equal(
      competeMayAccess({
        category: "hackathon_task",
        eventId: "e1",
        competeEventId: "e1",
        teamOnEvent: true,
      }),
      true,
    );
  });

  it("denies stranger / wrong event / staff-only category", () => {
    assert.equal(
      competeMayAccess({
        category: "hackathon_task",
        eventId: "e1",
        competeEventId: "e2",
        teamOnEvent: true,
      }),
      false,
    );
    assert.equal(
      competeMayAccess({
        category: "hackathon_submission",
        eventId: "e1",
        competeEventId: "e1",
        teamOnEvent: false,
      }),
      false,
    );
    assert.equal(
      competeMayAccess({
        category: "media",
        eventId: "e1",
        competeEventId: "e1",
        teamOnEvent: true,
      }),
      false,
    );
  });
});
