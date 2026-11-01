import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEGAL_NOTIFY_CAP,
  assertTestimonialVisibility,
  canShowTestimonial,
  capNotifyRecipients,
  diffLines,
  isPartnerPubliclyVisible,
  parseHighlightFeatures,
  parseTags,
} from "../cms.logic";
import { canWebsiteCap } from "@/src/features/admin/types";

describe("cms consent gates", () => {
  it("partners need granted + visible", () => {
    assert.equal(isPartnerPubliclyVisible({ consent_status: "granted", visible: true }), true);
    assert.equal(isPartnerPubliclyVisible({ consent_status: "granted", visible: false }), false);
    assert.equal(isPartnerPubliclyVisible({ consent_status: "pending", visible: true }), false);
    assert.equal(isPartnerPubliclyVisible({ consent_status: "revoked", visible: true }), false);
  });

  it("testimonials need consent confirmed", () => {
    assert.equal(canShowTestimonial({ consent_confirmed: true, visible: true }), true);
    assert.equal(canShowTestimonial({ consent_confirmed: false, visible: true }), false);
    assert.deepEqual(assertTestimonialVisibility(false, true), {
      ok: false,
      error: "Consent must be confirmed before a testimonial can be visible.",
    });
    assert.deepEqual(assertTestimonialVisibility(true, true), { ok: true });
  });
});

describe("legal notify cap", () => {
  it("caps at LEGAL_NOTIFY_CAP and logs leftover as skipped", () => {
    const recipients = Array.from({ length: LEGAL_NOTIFY_CAP + 25 }, (_, i) => i);
    const result = capNotifyRecipients(recipients);
    assert.equal(result.selected.length, LEGAL_NOTIFY_CAP);
    assert.equal(result.skipped, 25);
    assert.equal(result.capped, true);
    assert.equal(result.cap, LEGAL_NOTIFY_CAP);
  });

  it("does not cap when under limit", () => {
    const result = capNotifyRecipients([1, 2, 3], 100);
    assert.equal(result.capped, false);
    assert.equal(result.skipped, 0);
    assert.deepEqual(result.selected, [1, 2, 3]);
  });
});

describe("diffLines", () => {
  it("marks additions and removals", () => {
    const ops = diffLines("a\nb\nc", "a\nx\nc");
    assert.ok(ops.some((o) => o.type === "remove" && o.line === "b"));
    assert.ok(ops.some((o) => o.type === "add" && o.line === "x"));
    assert.ok(ops.some((o) => o.type === "equal" && o.line === "a"));
  });
});

describe("parsers", () => {
  it("parses highlight features and tags", () => {
    assert.deepEqual(parseHighlightFeatures("a\nb, c"), ["a", "b", "c"]);
    assert.deepEqual(parseTags(" Hero, Logo ,HERO "), ["hero", "logo"]);
  });
});

describe("website tab permission matrix", () => {
  const editor = { isOwner: false, permissions: ["website:view", "website:edit"] };
  const publisher = {
    isOwner: false,
    permissions: ["website:view", "website:edit", "website:publish"],
  };
  const legal = { isOwner: false, permissions: ["website:view", "legal:publish"] };
  const contact = { isOwner: false, permissions: ["website:view", "contact:manage"] };

  it("edit cannot publish pages or legal", () => {
    assert.equal(canWebsiteCap(editor, "website:edit"), true);
    assert.equal(canWebsiteCap(editor, "website:publish"), false);
    assert.equal(canWebsiteCap(editor, "legal:publish"), false);
    assert.equal(canWebsiteCap(editor, "contact:manage"), false);
  });

  it("publish and legal and contact are separate", () => {
    assert.equal(canWebsiteCap(publisher, "website:publish"), true);
    assert.equal(canWebsiteCap(publisher, "legal:publish"), false);
    assert.equal(canWebsiteCap(legal, "legal:publish"), true);
    assert.equal(canWebsiteCap(legal, "website:publish"), false);
    assert.equal(canWebsiteCap(contact, "contact:manage"), true);
    assert.equal(canWebsiteCap(contact, "website:edit"), false);
  });
});
