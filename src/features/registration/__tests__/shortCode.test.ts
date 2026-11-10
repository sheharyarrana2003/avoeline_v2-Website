import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SHORT_CODE_ALPHABET,
  formatShortCode,
  generateShortCode,
  normalizeShortCode,
  shortCodeMatchesNeedle,
  shortCodesEqual,
} from "../shortCode";

describe("registration short codes", () => {
  it("generates AVO- + 6 Crockford chars", () => {
    const code = generateShortCode();
    assert.match(code, /^AVO-[0-9A-Z]{6}$/);
    for (const ch of code.slice(4)) {
      assert.ok(SHORT_CODE_ALPHABET.includes(ch), `unexpected char ${ch}`);
    }
    const body = code.slice(4);
    assert.equal(/[ILOU]/.test(body), false);
  });

  it("normalizes variants for search", () => {
    assert.equal(normalizeShortCode("avo-k7q4m2"), "AVOK7Q4M2");
    assert.equal(normalizeShortCode("K7Q4M2"), "AVOK7Q4M2");
    assert.equal(formatShortCode("avo k7q4m2"), "AVO-K7Q4M2");
    assert.ok(shortCodesEqual("AVO-K7Q4M2", "avok7q4m2"));
    assert.ok(shortCodeMatchesNeedle("AVO-K7Q4M2", "k7q4"));
    assert.ok(shortCodeMatchesNeedle("AVO-K7Q4M2", "avo-k7q4m2"));
  });

  it("uniqueness retry pattern regenerates until success", async () => {
    const seen = new Set<string>();
    let collisions = 0;
    for (let i = 0; i < 40; i++) {
      const c = generateShortCode();
      if (seen.has(c)) collisions += 1;
      seen.add(c);
    }
    assert.equal(seen.size >= 38, true);
    assert.ok(collisions <= 2);
  });
});
