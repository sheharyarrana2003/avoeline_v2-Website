import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planIsFree } from "@/src/features/onboarding/planHelpers";
import type { PlanRow } from "@/src/features/saas/saas.service";

function plan(partial: Partial<PlanRow> & Pick<PlanRow, "key" | "name">): PlanRow {
  return {
    id: "p1",
    description: null,
    price_monthly: 0,
    price_yearly: 0,
    currency: "PKR",
    is_active: true,
    sort_order: 0,
    included_modules: [],
    ...partial,
  };
}

describe("planIsFree (onboarding smoke helper)", () => {
  it("treats free / vendor_free and zero-price plans as free", () => {
    assert.equal(planIsFree(plan({ key: "free", name: "Free", price_monthly: 0 })), true);
    assert.equal(
      planIsFree(plan({ key: "vendor_free", name: "Vendor Free", price_monthly: 0 })),
      true,
    );
    assert.equal(planIsFree(plan({ key: "starter", name: "Starter", price_monthly: 0 })), true);
  });

  it("treats positive monthly price as paid", () => {
    assert.equal(planIsFree(plan({ key: "pro", name: "Pro", price_monthly: 2999 })), false);
    assert.equal(
      planIsFree(plan({ key: "vendor_pro", name: "Vendor Pro", price_monthly: 2999 })),
      false,
    );
  });
});
