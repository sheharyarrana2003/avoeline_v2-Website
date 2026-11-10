import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyPromoDraft,
  emptyTierDraft,
  TIER_FIELD_LABELS,
  PROMO_FIELD_LABELS,
} from "../components/TiersAndPromosEditor";

describe("TiersAndPromosEditor drafts + labels", () => {
  it("exposes every required tier and promo label", () => {
    const tierLabels = new Set<string>(TIER_FIELD_LABELS);
    const promoLabels = new Set<string>(PROMO_FIELD_LABELS);
    for (const label of [
      "Name",
      "Price",
      "Seats",
      "Available from",
      "Available until",
      "Active",
      "Early bird",
    ]) {
      assert.ok(tierLabels.has(label), `missing tier label ${label}`);
    }
    for (const label of ["Code", "Type", "Value", "Scope", "Usage limit", "Expiry", "Active"]) {
      assert.ok(promoLabels.has(label), `missing promo label ${label}`);
    }
  });

  it("empty seats stay null (unlimited), not 0", () => {
    const tier = emptyTierDraft({ name: "General", price: 100 });
    assert.equal(tier.seatsAvailable, null);
    assert.equal(tier.active, true);
    assert.equal(tier.isEarlyBird, false);
  });

  it("promo draft defaults are safe", () => {
    const promo = emptyPromoDraft({ code: "SAVE10" });
    assert.equal(promo.code, "SAVE10");
    assert.equal(promo.discountType, "percent");
    assert.equal(promo.usageLimit, null);
    assert.equal(promo.trackId, null);
    assert.equal(promo.active, true);
  });
});
