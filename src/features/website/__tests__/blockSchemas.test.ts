import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBlockDraft } from "../blocks/schemas";

describe("parseBlockDraft", () => {
  it("parses a valid hero draft", () => {
    const result = parseBlockDraft("hero", {
      headline: "Run every event from one place.",
      subheadline: "Built for organizers.",
      primaryCta: { label: "Get started free", href: "/auth/signup" },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.type, "hero");
    if (result.type !== "hero") return;
    assert.equal(result.data.headline, "Run every event from one place.");
    assert.equal(result.data.primaryCta?.label, "Get started free");
  });

  it("rejects unknown fields on hero", () => {
    const result = parseBlockDraft("hero", {
      headline: "Hello",
      inventedStat: 999,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(
      result.error.issues.some(
        (i) => i.path.includes("inventedStat") || i.code === "unrecognized_keys",
      ),
    );
  });

  it("rejects unknown block types", () => {
    const result = parseBlockDraft("not_a_block", { headline: "x" });
    assert.equal(result.ok, false);
  });
});
