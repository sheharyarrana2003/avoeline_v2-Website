import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPlansForAudience,
  overrideConflictKey,
  parseTenantBoardFilters,
  serializeTenantBoardFilters,
} from "../tenantBoard.filters";
import { canTenantCap } from "@/src/features/admin/types";

describe("tenantBoard.filters URL round-trip", () => {
  it("parses and serializes tab, type, plan, flags, sort", () => {
    const qs =
      "tab=overrides&type=organizer,vendor&plan=pro,free&status=active&hasOverrides=1&expiring=1&sort=name&page=2&oeffect=grant&q=uni";
    const filters = parseTenantBoardFilters(new URLSearchParams(qs));
    assert.equal(filters.tab, "overrides");
    assert.deepEqual(filters.type, ["organizer", "vendor"]);
    assert.deepEqual(filters.plan, ["pro", "free"]);
    assert.deepEqual(filters.status, ["active"]);
    assert.equal(filters.hasOverrides, true);
    assert.equal(filters.expiringSoon, true);
    assert.equal(filters.sort, "name");
    assert.equal(filters.page, 2);
    assert.deepEqual(filters.overrideEffect, ["grant"]);
    assert.equal(filters.q, "uni");

    const again = parseTenantBoardFilters(
      new URLSearchParams(serializeTenantBoardFilters(filters)),
    );
    assert.equal(again.tab, filters.tab);
    assert.deepEqual(again.type, filters.type);
    assert.deepEqual(again.plan, filters.plan);
    assert.equal(again.sort, filters.sort);
    assert.equal(again.q, filters.q);
    assert.equal(again.hasOverrides, true);
    assert.equal(again.expiringSoon, true);
  });
});

describe("filterPlansForAudience", () => {
  const plans = [
    { key: "free", audience: "organizer" as string | null },
    { key: "pro", audience: "both" as string | null },
    { key: "vendor_free", audience: "vendor" as string | null },
    { key: "legacy", audience: null },
  ];

  it("filters organizer / department / vendor audiences", () => {
    assert.deepEqual(
      filterPlansForAudience(plans, "organizer").map((p) => p.key),
      ["free", "pro", "legacy"],
    );
    assert.deepEqual(
      filterPlansForAudience(plans, "department").map((p) => p.key),
      ["free", "pro", "legacy"],
    );
    assert.deepEqual(
      filterPlansForAudience(plans, "vendor").map((p) => p.key),
      ["pro", "vendor_free"],
    );
  });
});

describe("overrideConflictKey", () => {
  it("prefers org scope when targetOrgId set", () => {
    assert.equal(
      overrideConflictKey({ organizerId: "u1", targetOrgId: "o1", moduleKey: "certificates" }),
      "org:o1:certificates",
    );
    assert.equal(
      overrideConflictKey({ organizerId: "u1", targetOrgId: null, moduleKey: "certificates" }),
      "user:u1:certificates",
    );
  });
});

describe("canTenantCap", () => {
  it("owner has all; manage implies all; otherwise specific cap", () => {
    assert.equal(canTenantCap({ isOwner: true, permissions: [] }, "tenants:create"), true);
    assert.equal(
      canTenantCap({ isOwner: false, permissions: ["tenants:manage"] }, "pricing:manage"),
      true,
    );
    assert.equal(
      canTenantCap(
        { isOwner: false, permissions: ["tenants:view", "tenants:create"] },
        "tenants:create",
      ),
      true,
    );
    assert.equal(
      canTenantCap(
        { isOwner: false, permissions: ["tenants:view", "tenants:create"] },
        "pricing:manage",
      ),
      false,
    );
  });
});
