import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";

/**
 * Mirrors assertPublicRegistrationEvent lifecycle rules without hitting Supabase.
 * Draft / completed must be CLOSED (not "Event not found").
 */
describe("public registration eligibility lifecycle", () => {
  it("draft is not active — proof upload must reject as closed", () => {
    const life = eventLifecycle("draft", { startDate: "2026-12-01" });
    assert.equal(life, "draft");
    assert.equal(isActiveLifecycle(life), false);
  });

  it("published upcoming is active", () => {
    const life = eventLifecycle("published", {
      startDate: "2099-01-01",
      endDate: "2099-01-02",
    });
    assert.equal(life, "upcoming");
    assert.equal(isActiveLifecycle(life), true);
  });

  it("completed is not active", () => {
    const life = eventLifecycle("published", {
      startDate: "2020-01-01",
      endDate: "2020-01-02",
    });
    assert.equal(life, "completed");
    assert.equal(isActiveLifecycle(life), false);
  });
});
