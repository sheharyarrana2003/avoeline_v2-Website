import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePublicStats, PUBLIC_STATS_KEYS } from "../publicStats";
import { SITE_ALL, SITE_STATS, sitePage } from "../cacheTags";

describe("normalizePublicStats", () => {
  it("returns only numeric aggregate keys (no personal data)", () => {
    const stats = normalizePublicStats({
      events_count: 3,
      registrations_count: "10",
      active_organizers_count: 2,
      institutions_count: 1,
      certificates_count: 0,
      email: "leak@example.com",
      name: "Should drop",
    });
    assert.ok(stats);
    assert.deepEqual(Object.keys(stats).sort(), [...PUBLIC_STATS_KEYS].sort());
    for (const k of PUBLIC_STATS_KEYS) {
      assert.equal(typeof stats[k], "number");
      assert.ok(Number.isFinite(stats[k]));
    }
    assert.equal(stats.registrations_count, 10);
    assert.equal("email" in stats, false);
  });

  it("returns null for empty input", () => {
    assert.equal(normalizePublicStats(null), null);
    assert.equal(normalizePublicStats(undefined), null);
  });
});

describe("publish revalidation tags", () => {
  it("page publish should invalidate page tag and SITE_ALL", () => {
    const slug = "home";
    const tags = [sitePage(slug), SITE_ALL];
    assert.deepEqual(tags, ["site:page:home", "site:all"]);
    assert.ok(tags.includes(SITE_STATS) === false);
  });
});
