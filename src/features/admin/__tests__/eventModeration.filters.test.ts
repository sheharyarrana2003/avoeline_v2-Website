import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryOptions,
  buildHostParts,
  formatHostLine2,
  matchesPublication,
  matchesTiming,
  parseAdminEventFilters,
  serializeAdminEventFilters,
  resolveCategoryId,
} from "../eventModeration.filters";

describe("eventModeration.filters URL round-trip", () => {
  it("parses and serializes publication + timing + sort", () => {
    const qs =
      "tab=all&pub=draft,published&timing=upcoming,ongoing&access=public&cat=technology&sort=starts_soon&q=hack&hasRegs=1";
    const filters = parseAdminEventFilters(new URLSearchParams(qs));
    assert.deepEqual(filters.publication, ["draft", "published"]);
    assert.deepEqual(filters.timing, ["upcoming", "ongoing"]);
    assert.deepEqual(filters.access, ["public"]);
    assert.deepEqual(filters.categoryIds, ["technology"]);
    assert.equal(filters.sort, "starts_soon");
    assert.equal(filters.q, "hack");
    assert.equal(filters.hasRegs, true);

    const again = parseAdminEventFilters(new URLSearchParams(serializeAdminEventFilters(filters)));
    assert.deepEqual(again.publication, filters.publication);
    assert.deepEqual(again.timing, filters.timing);
    assert.equal(again.sort, filters.sort);
    assert.equal(again.q, filters.q);
  });

  it("combines publication and timing independently", () => {
    assert.equal(matchesPublication("published", false, ["published"]), true);
    assert.equal(matchesPublication("draft", true, ["unpublished"]), true);
    assert.equal(matchesPublication("draft", true, ["draft"]), false);
    assert.equal(matchesPublication("published", false, ["draft", "published"]), true);
    assert.equal(matchesTiming("upcoming", ["upcoming", "ongoing"]), true);
    assert.equal(matchesTiming("completed", ["upcoming"]), false);
    assert.equal(matchesTiming("upcoming", []), true);
  });
});

describe("host label", () => {
  it("does not repeat department as club", () => {
    const dept = buildHostParts({
      organizerName: "Faculty of Business",
      orgType: "department",
      orgName: "Faculty of Business",
      profileOrgName: "Faculty of Business",
    });
    assert.equal(dept.organizerName, "Faculty of Business");
    assert.equal(dept.departmentName, "Faculty of Business");
    assert.equal(dept.clubName, undefined);
    assert.equal(formatHostLine2(dept), "Faculty of Business");

    const club = buildHostParts({
      organizerName: "Biz Club",
      orgType: "club",
      orgName: "Biz Club",
      parentOrgName: "Faculty of Business",
    });
    assert.equal(formatHostLine2(club), "Faculty of Business › Biz Club");
  });
});

describe("category options", () => {
  it("dedupes by id and distinguishes duplicate names", () => {
    const opts = buildCategoryOptions([
      { id: "technology", name: "Technology", category_type: "super_category" },
      { id: "tech-format", name: "Technology", category_type: "event_format" },
      { id: "education", name: "Education", category_type: "super_category" },
    ]);
    assert.equal(opts.length, 3);
    const techLabels = opts.filter((o) => o.label.toLowerCase().includes("technology"));
    assert.equal(techLabels.length, 2);
    assert.ok(techLabels.every((o) => o.label.includes("(")));
    assert.equal(opts.find((o) => o.id === "education")?.label, "Education");
  });

  it("resolves Technology vs technology to the same category id", () => {
    const cats = [{ id: "technology", name: "Technology" }];
    assert.equal(resolveCategoryId("Technology", cats), "technology");
    assert.equal(resolveCategoryId("technology", cats), "technology");
  });
});
