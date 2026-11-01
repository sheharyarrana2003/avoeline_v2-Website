import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeDraftPayload } from "../blockSanitize";

describe("sanitizeDraftPayload", () => {
  it("strips script tags and javascript: URLs from rich_text.markdown", () => {
    const result = sanitizeDraftPayload("rich_text", {
      markdown: "Hello <script>alert(1)</script> [x](javascript:alert(1))",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const md = String((result.draft as { markdown?: string }).markdown ?? "");
    assert.equal(md.includes("<script>"), false);
    assert.equal(md.includes("javascript:"), false);
    assert.ok(md.includes("Hello"));
  });

  it("strips XSS from faq items[].answer", () => {
    const result = sanitizeDraftPayload("faq", {
      title: "FAQ",
      items: [
        {
          question: "Safe?",
          answer: "<style>x{}</style>Yes <img src=x onerror=alert(1)> and [go](javascript:void(0))",
        },
      ],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const items = (result.draft as { items: Array<{ answer: string }> }).items;
    assert.equal(items[0].answer.includes("<style>"), false);
    assert.equal(items[0].answer.includes("<img"), false);
    assert.equal(items[0].answer.includes("javascript:"), false);
    assert.ok(items[0].answer.includes("Yes"));
  });

  it("rejects unknown block keys", () => {
    const result = sanitizeDraftPayload("not_a_block", { markdown: "x" });
    assert.equal(result.ok, false);
  });

  it("rejects unrecognized fields on known blocks", () => {
    const result = sanitizeDraftPayload("hero", {
      headline: "Hi",
      evilPayload: "<script>",
    });
    assert.equal(result.ok, false);
  });

  it("requires hero imageAlt when imageUrl is set", () => {
    const missing = sanitizeDraftPayload("hero", {
      headline: "Hi",
      imageUrl: "https://example.com/a.webp",
      imageAlt: "",
    });
    assert.equal(missing.ok, false);

    const ok = sanitizeDraftPayload("hero", {
      headline: "Hi",
      imageUrl: "https://example.com/a.webp",
      imageAlt: "Product screenshot",
    });
    assert.equal(ok.ok, true);
  });

  it("requires logo alt when logoUrl is set", () => {
    const missing = sanitizeDraftPayload("logo_wall", {
      items: [{ name: "Acme", logoUrl: "https://example.com/logo.webp", alt: "" }],
    });
    assert.equal(missing.ok, false);

    const ok = sanitizeDraftPayload("logo_wall", {
      items: [{ name: "Acme", logoUrl: "https://example.com/logo.webp", alt: "Acme logo" }],
    });
    assert.equal(ok.ok, true);
  });

  it("requires event imageAlt when imageUrl is set", () => {
    const missing = sanitizeDraftPayload("event_showcase", {
      items: [{ title: "E", imageUrl: "https://example.com/e.webp", imageAlt: "  " }],
    });
    assert.equal(missing.ok, false);
  });
});
