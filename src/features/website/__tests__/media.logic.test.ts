import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_MEDIA_MAX_BYTES, validateSiteMediaUpload } from "../media.logic";

describe("validateSiteMediaUpload", () => {
  it("rejects empty alt", () => {
    const r = validateSiteMediaUpload({
      alt: "  ",
      mime: "image/webp",
      size: 100,
    });
    assert.equal(r.ok, false);
  });

  it("rejects SVG", () => {
    const r = validateSiteMediaUpload({
      alt: "icon",
      mime: "image/svg+xml",
      size: 100,
    });
    assert.equal(r.ok, false);
  });

  it("rejects oversize files", () => {
    const r = validateSiteMediaUpload({
      alt: "big",
      mime: "image/jpeg",
      size: SITE_MEDIA_MAX_BYTES + 1,
    });
    assert.equal(r.ok, false);
  });

  it("accepts WebP under the size cap with alt", () => {
    const r = validateSiteMediaUpload({
      alt: "Hero",
      mime: "image/webp",
      size: 1024,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.alt, "Hero");
  });
});
