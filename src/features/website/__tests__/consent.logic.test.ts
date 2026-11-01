import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_COMMUNITY_OPT_IN,
  assertStaffPiiReason,
  buildUnsubscribeToken,
  filterCommunityListOnly,
  isActiveMarketingConsent,
  parseAndVerifyUnsubscribeToken,
  requireLegalAcceptance,
  suppressBuckets,
} from "../consent.logic";

describe("consent defaults and legal gate", () => {
  it("community opt-in defaults to unticked", () => {
    assert.equal(DEFAULT_COMMUNITY_OPT_IN, false);
  });

  it("requires legal acceptance", () => {
    assert.deepEqual(requireLegalAcceptance(false), {
      ok: false,
      error: "You must accept the Terms and Privacy Policy to continue.",
    });
    assert.deepEqual(requireLegalAcceptance(true), { ok: true });
  });
});

describe("unsubscribe tokens", () => {
  it("round-trips signed tokens and withdraw parsing", () => {
    const secret = "test-unsub-secret-at-least-16";
    const token = buildUnsubscribeToken({
      email: "Person@Example.com",
      scope: "community",
      secret,
      nonce: "abc",
    });
    const parsed = parseAndVerifyUnsubscribeToken(token, secret);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.email, "person@example.com");
      assert.equal(parsed.scope, "community");
    }
    assert.equal(parseAndVerifyUnsubscribeToken(token, "wrong-secret!!!!!!").ok, false);
  });
});

describe("community list purity", () => {
  it("active filter ignores registration emails", () => {
    const consents = [
      { email: "a@x.com", withdrawn_at: null },
      { email: "b@x.com", withdrawn_at: "2026-01-01" },
    ];
    const regs = ["reg@x.com", "a@x.com"];
    const out = filterCommunityListOnly(consents, regs);
    assert.deepEqual(
      out.map((r) => r.email),
      ["a@x.com"],
    );
    assert.ok(!out.some((r) => r.email === "reg@x.com"));
  });

  it("isActiveMarketingConsent", () => {
    assert.equal(isActiveMarketingConsent({ withdrawn_at: null }), true);
    assert.equal(isActiveMarketingConsent({ withdrawn_at: "x" }), false);
  });
});

describe("insights suppression", () => {
  it("hides buckets under 5", () => {
    const rows = [
      { bucket: "a", count: 4 },
      { bucket: "b", count: 5 },
      { bucket: "c", count: 12 },
    ];
    assert.deepEqual(suppressBuckets(rows), [
      { bucket: "b", count: 5 },
      { bucket: "c", count: 12 },
    ]);
  });
});

describe("staff PII reason", () => {
  it("rejects empty or short reasons", () => {
    assert.equal(assertStaffPiiReason("").ok, false);
    assert.equal(assertStaffPiiReason("short").ok, false);
    const ok = assertStaffPiiReason("Investigating ticket #1234 for refund");
    assert.equal(ok.ok, true);
  });
});
