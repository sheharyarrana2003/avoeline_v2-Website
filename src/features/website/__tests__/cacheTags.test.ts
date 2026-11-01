import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITE_ALL,
  SITE_EVENTS,
  SITE_NAV,
  SITE_PLANS,
  SITE_SETTINGS,
  SITE_STATS,
  sitePage,
} from "../cacheTags";

describe("cacheTags", () => {
  it("keeps stable tag strings", () => {
    assert.equal(SITE_NAV, "site:nav");
    assert.equal(SITE_STATS, "site:stats");
    assert.equal(SITE_SETTINGS, "site:settings");
    assert.equal(SITE_PLANS, "site:plans");
    assert.equal(SITE_EVENTS, "site:events");
    assert.equal(SITE_ALL, "site:all");
    assert.equal(sitePage("home"), "site:page:home");
    assert.equal(sitePage("plans"), "site:page:plans");
  });
});
