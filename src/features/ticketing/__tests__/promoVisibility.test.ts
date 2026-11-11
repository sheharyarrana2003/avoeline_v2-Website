import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Pure filter mirroring TicketingService.listPublicPromoChips mapping. */
function toPublicChips(
  promos: Array<{
    id: string;
    code: string;
    active: boolean;
    visibility: "public" | "private";
    discountType: "percent" | "flat";
    value: number;
    trackId: string | null;
  }>,
) {
  return promos
    .filter((p) => p.active && p.visibility === "public")
    .map((p) => ({
      id: p.id,
      label: p.code,
      discountSummary: p.discountType === "percent" ? `${p.value}% off` : `${p.value} off`,
      trackId: p.trackId,
    }));
}

describe("promo visibility filtering", () => {
  it("excludes private codes from public chips", () => {
    const chips = toPublicChips([
      {
        id: "1",
        code: "PUBLIC10",
        active: true,
        visibility: "public",
        discountType: "percent",
        value: 10,
        trackId: null,
      },
      {
        id: "2",
        code: "SECRET50",
        active: true,
        visibility: "private",
        discountType: "percent",
        value: 50,
        trackId: null,
      },
    ]);
    assert.equal(chips.length, 1);
    assert.equal(chips[0].label, "PUBLIC10");
    assert.ok(!JSON.stringify(chips).includes("SECRET50"));
  });

  it("excludes inactive public codes", () => {
    const chips = toPublicChips([
      {
        id: "1",
        code: "OLD",
        active: false,
        visibility: "public",
        discountType: "flat",
        value: 100,
        trackId: null,
      },
    ]);
    assert.equal(chips.length, 0);
  });
});
