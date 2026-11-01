import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractLegalToc,
  prepareLegalMarkdown,
  sanitizeLegalMarkdown,
  slugifyHeading,
} from "../legalMarkdown";

describe("sanitizeLegalMarkdown", () => {
  it("strips script tags and raw HTML", () => {
    const raw = `## Hello\n\n<script>alert(1)</script>\n\n<p>Hi</p> and <b>bold</b>`;
    const out = sanitizeLegalMarkdown(raw);
    assert.equal(out.includes("<script"), false);
    assert.equal(out.includes("<p>"), false);
    assert.equal(out.includes("alert"), false);
    assert.match(out, /Hi/);
    assert.match(out, /bold/);
  });

  it("neutralizes javascript: links", () => {
    const out = sanitizeLegalMarkdown("[x](javascript:alert(1))");
    assert.equal(out.includes("javascript:"), false);
  });
});

describe("extractLegalToc", () => {
  it("builds ids from ## headings", () => {
    const toc = extractLegalToc("## Who we are\n\nText\n\n## Your rights\n");
    assert.equal(toc.length, 2);
    assert.equal(toc[0].text, "Who we are");
    assert.equal(toc[0].id, slugifyHeading("Who we are"));
    assert.equal(toc[1].id, slugifyHeading("Your rights"));
  });
});

describe("prepareLegalMarkdown", () => {
  it("returns sanitized body and toc together", () => {
    const { body, toc } = prepareLegalMarkdown("## One\n\n<script>x</script>\n\nBody");
    assert.equal(toc.length, 1);
    assert.equal(body.includes("<script"), false);
  });
});
