import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterStatsByThreshold,
  formatStatValue,
  shouldHideEmptySection,
  sortPublicPlans,
} from "../marketingData.logic";
import type { PublicStats } from "../publicStats";

const stats: PublicStats = {
  events_count: 12,
  registrations_count: 3,
  active_organizers_count: 8,
  institutions_count: 0,
  certificates_count: 100,
};

describe("filterStatsByThreshold", () => {
  it("keeps visible stats at or above threshold", () => {
    const items = filterStatsByThreshold(stats, [
      { key: "events_count", label: "Events", visible: true, min_threshold: 10 },
      { key: "registrations_count", label: "Regs", visible: true, min_threshold: 10 },
      { key: "institutions_count", label: "Orgs", visible: true, min_threshold: 0 },
      { key: "active_organizers_count", label: "Organizers", visible: false, min_threshold: 0 },
    ]);
    assert.deepEqual(
      items.map((i) => i.key),
      ["events_count", "institutions_count"],
    );
    assert.equal(items[0].value, "12");
    assert.equal(items[1].raw, 0);
  });

  it("returns empty when stats or settings missing", () => {
    assert.deepEqual(filterStatsByThreshold(null, []), []);
    assert.deepEqual(filterStatsByThreshold(stats, null), []);
  });
});

describe("formatStatValue", () => {
  it("supports compact notation", () => {
    assert.match(formatStatValue(1200, "compact"), /1(\.|,)?2?\s?K/i);
  });
});

describe("sortPublicPlans", () => {
  it("orders by sort_order then recommended", () => {
    const sorted = sortPublicPlans([
      { sort_order: 2, is_recommended: true, key: "b" },
      { sort_order: 1, is_recommended: false, key: "a" },
      { sort_order: 2, is_recommended: false, key: "c" },
    ]);
    assert.deepEqual(
      sorted.map((p) => p.key),
      ["a", "b", "c"],
    );
  });
});

describe("shouldHideEmptySection", () => {
  it("hides null, undefined, and empty arrays", () => {
    assert.equal(shouldHideEmptySection([]), true);
    assert.equal(shouldHideEmptySection(null), true);
    assert.equal(shouldHideEmptySection(undefined), true);
    assert.equal(shouldHideEmptySection([{ id: 1 }]), false);
  });
});
