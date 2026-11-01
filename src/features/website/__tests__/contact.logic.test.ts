import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { __resetRateLimitForTests } from "@/src/lib/rateLimit";
import {
  CONTACT_RATE_LIMIT,
  assertTurnstileTokenPresent,
  checkContactRateLimit,
  hashContactIp,
  isContactHoneypotTripped,
  isTurnstileRequired,
  sanitizeContactHeader,
  scoreContactSpam,
} from "../contact.logic";

describe("sanitizeContactHeader", () => {
  it("strips CR and LF to block header injection", () => {
    assert.equal(sanitizeContactHeader("Alice\r\nBcc: evil@x.com"), "Alice Bcc: evil@x.com");
    assert.equal(sanitizeContactHeader("Hi\nThere"), "Hi There");
    assert.equal(sanitizeContactHeader("Ok\rtopic"), "Ok topic");
  });

  it("collapses whitespace and trims", () => {
    assert.equal(sanitizeContactHeader("  sales   inquiry  "), "sales inquiry");
  });

  it("strips other C0 control characters", () => {
    assert.equal(sanitizeContactHeader("A\u0000B\u0007C"), "A B C");
  });
});

describe("isContactHoneypotTripped", () => {
  it("passes empty / whitespace / missing website", () => {
    assert.equal(isContactHoneypotTripped(""), false);
    assert.equal(isContactHoneypotTripped("   "), false);
    assert.equal(isContactHoneypotTripped(undefined), false);
    assert.equal(isContactHoneypotTripped(null), false);
  });

  it("trips when the honeypot is filled", () => {
    assert.equal(isContactHoneypotTripped("https://spam.example"), true);
    assert.equal(isContactHoneypotTripped("x"), true);
  });
});

describe("hashContactIp + checkContactRateLimit", () => {
  it("hashes IP with salt (sha256 hex)", () => {
    const a = hashContactIp("1.2.3.4", "salt-a");
    const b = hashContactIp("1.2.3.4", "salt-b");
    assert.equal(a.length, 64);
    assert.notEqual(a, b);
    assert.equal(hashContactIp("1.2.3.4", "salt-a"), a);
  });

  it("rate-limits by hashed IP after CONTACT_RATE_LIMIT hits", () => {
    __resetRateLimitForTests();
    const ipHash = hashContactIp("9.9.9.9", "test-salt");
    for (let i = 0; i < CONTACT_RATE_LIMIT; i += 1) {
      assert.equal(checkContactRateLimit(ipHash).ok, true);
    }
    const blocked = checkContactRateLimit(ipHash);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
  });

  it("tracks different IP hashes independently", () => {
    __resetRateLimitForTests();
    const a = hashContactIp("10.0.0.1", "s");
    const b = hashContactIp("10.0.0.2", "s");
    for (let i = 0; i < CONTACT_RATE_LIMIT; i += 1) {
      assert.equal(checkContactRateLimit(a).ok, true);
    }
    assert.equal(checkContactRateLimit(a).ok, false);
    assert.equal(checkContactRateLimit(b).ok, true);
  });
});

describe("scoreContactSpam", () => {
  it("scores honeypot trips higher", () => {
    const clean = scoreContactSpam({
      honeypotTripped: false,
      message: "Hello, I have a question about plans for our department.",
      name: "Sam",
    });
    const spam = scoreContactSpam({
      honeypotTripped: true,
      message: "buy",
      name: "",
    });
    assert.ok(spam > clean);
  });
});

describe("Turnstile gate", () => {
  it("is required only when secret is set", () => {
    assert.equal(isTurnstileRequired(undefined), false);
    assert.equal(isTurnstileRequired(""), false);
    assert.equal(isTurnstileRequired("  "), false);
    assert.equal(isTurnstileRequired("secret"), true);
  });

  it("fails closed when secret is set and token is missing", () => {
    assert.equal(assertTurnstileTokenPresent({ secret: null, token: undefined }).ok, true);
    assert.equal(assertTurnstileTokenPresent({ secret: "s", token: "tok" }).ok, true);
    const missing = assertTurnstileTokenPresent({ secret: "s", token: "  " });
    assert.equal(missing.ok, false);
  });
});
