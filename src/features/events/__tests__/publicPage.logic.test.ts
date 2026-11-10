import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HERO_BANNER_OVERLAY_FORBIDDEN,
  absoluteShareUrl,
  buildPublicMediaItems,
  buildShareMenuItems,
  calendarActionsAllowed,
  publicPaymentInstructions,
  showSeatsFact,
  whatHappensNextLine,
} from "../components/public/publicPage.logic";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("public page N3 helpers", () => {
  it("forbids banner overlays in hero source", () => {
    const heroPath = join(
      process.cwd(),
      "src/features/events/components/public/PublicEventHero.tsx",
    );
    const src = readFileSync(heroPath, "utf8");
    for (const token of HERO_BANNER_OVERLAY_FORBIDDEN) {
      assert.equal(src.includes(token), false, `hero must not contain overlay token ${token}`);
    }
    assert.ok(src.includes("object-cover"));
    assert.ok(src.includes("aspect-video"));
  });

  it("builds share menu items", () => {
    const items = buildShareMenuItems("https://example.com/e/1", "Demo Night");
    assert.deepEqual(
      items.map((i) => i.id),
      ["copy", "whatsapp", "linkedin", "x", "email"],
    );
    assert.ok(items.find((i) => i.id === "whatsapp")?.href?.includes("wa.me"));
    assert.ok(items.find((i) => i.id === "email")?.href?.startsWith("mailto:"));
  });

  it("absoluteShareUrl joins origin and path", () => {
    assert.equal(
      absoluteShareUrl("/e/abc", "https://avoeline.test"),
      "https://avoeline.test/e/abc",
    );
    assert.equal(
      absoluteShareUrl("https://avoeline.test/e/abc", "https://ignored"),
      "https://avoeline.test/e/abc",
    );
  });

  it("gates calendar actions", () => {
    assert.equal(
      calendarActionsAllowed({ lifecycle: "upcoming", status: "published" }, false),
      true,
    );
    assert.equal(
      calendarActionsAllowed({ lifecycle: "cancelled", status: "published" }, false),
      false,
    );
    assert.equal(
      calendarActionsAllowed({ lifecycle: "archived", status: "published" }, true),
      false,
    );
    assert.equal(calendarActionsAllowed({ lifecycle: "draft", status: "draft" }, true), true);
  });

  it("builds media list with banner first", () => {
    assert.deepEqual(
      buildPublicMediaItems({
        bannerImage: "https://cdn/b.jpg",
        galleryImages: ["https://cdn/g1.jpg", "https://cdn/b.jpg"],
      }),
      [
        { src: "https://cdn/b.jpg", kind: "banner" },
        { src: "https://cdn/g1.jpg", kind: "gallery" },
      ],
    );
    assert.deepEqual(buildPublicMediaItems({ bannerImage: "", galleryImages: [] }), []);
  });

  it("hides seats when unlimited", () => {
    assert.equal(showSeatsFact({ total: 0, left: null }), false);
    assert.equal(showSeatsFact({ total: 100, left: 40 }), true);
  });

  it("payment instructions only for paid with text", () => {
    assert.equal(publicPaymentInstructions(true, "IBAN 123"), null);
    assert.equal(publicPaymentInstructions(false, "  "), null);
    assert.equal(publicPaymentInstructions(false, "Pay to JazzCash 03xx"), "Pay to JazzCash 03xx");
  });

  it("what happens next covers approval and free/paid", () => {
    assert.ok(
      whatHappensNextLine({ isFree: true, requiresApproval: false }).includes("right away"),
    );
    assert.ok(
      whatHappensNextLine({ isFree: false, requiresApproval: true }).includes("payment proof"),
    );
  });
});
