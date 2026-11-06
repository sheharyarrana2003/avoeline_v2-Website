import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashOAuthState,
  pkcePair,
  randomUrlSafe,
} from "@/src/features/connections/providers/google/oauth";
import {
  missingRequiredScopes,
  mapGoogleOAuthError,
} from "@/src/features/connections/providers/google/errors";
import { sameOriginReturnTo } from "@/src/features/connections/lib/returnTo";
import { requiredScopesForCapability } from "@/src/features/connections/catalog";

describe("connections oauth / PKCE", () => {
  it("generates PKCE verifier and S256 challenge", () => {
    const { verifier, challenge } = pkcePair();
    assert.ok(verifier.length >= 32);
    assert.ok(challenge.length >= 32);
    assert.notEqual(verifier, challenge);
  });

  it("hashes state stably", () => {
    const state = randomUrlSafe(24);
    assert.equal(hashOAuthState(state), hashOAuthState(state));
    assert.notEqual(hashOAuthState(state), hashOAuthState(state + "x"));
  });

  it("rejects when gmail.send scope unticked", () => {
    const required = requiredScopesForCapability("email.send");
    const granted = ["openid", "email"];
    const missing = missingRequiredScopes(granted, required);
    assert.deepEqual(missing, ["https://www.googleapis.com/auth/gmail.send"]);
  });

  it("maps access_denied admin block", () => {
    const mapped = mapGoogleOAuthError("access_denied", "admin policy blocked the app");
    assert.equal(mapped.kind, "admin_blocked");
  });

  it("same-origin returnTo only", () => {
    assert.equal(
      sameOriginReturnTo("/organizer/x/settings/connections", "https://a.com"),
      "/organizer/x/settings/connections",
    );
    assert.equal(sameOriginReturnTo("https://evil.com/phish", "https://a.com"), "/");
    assert.equal(sameOriginReturnTo("https://a.com/ok", "https://a.com"), "/ok");
  });
});
