import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPublicBlockRenderable,
  isPublicPageEligible,
  selectPublicBlockPayload,
} from "../publishedContent.logic";

describe("published content contract", () => {
  it("only published pages are public-eligible", () => {
    assert.equal(isPublicPageEligible("published"), true);
    assert.equal(isPublicPageEligible("draft"), false);
    assert.equal(isPublicPageEligible(null), false);
  });

  it("public loaders never prefer draft jsonb over published", () => {
    const payload = selectPublicBlockPayload({
      published: { headline: "Live" },
      draft: { headline: "Secret draft XSS <script>" },
    });
    assert.deepEqual(payload, { headline: "Live" });

    assert.equal(
      selectPublicBlockPayload({
        published: null,
        draft: { headline: "only draft" },
      }),
      null,
    );
  });

  it("hidden or unpublished blocks are not renderable", () => {
    assert.equal(
      isPublicBlockRenderable({
        visible: true,
        published: { title: "ok" },
        draft: null,
      }),
      true,
    );
    assert.equal(
      isPublicBlockRenderable({
        visible: false,
        published: { title: "ok" },
      }),
      false,
    );
    assert.equal(
      isPublicBlockRenderable({
        visible: true,
        published: null,
        draft: { title: "draft only" },
      }),
      false,
    );
  });
});
