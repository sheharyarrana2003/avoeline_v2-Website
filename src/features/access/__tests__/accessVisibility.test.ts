import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  toDbVisibility,
  toUiAccessType,
  wizardAccessTypeToVisibility,
} from "../lib/accessVisibility";
import {
  accessUnlockCookieName,
  mintAccessUnlockToken,
  verifyAccessUnlockToken,
} from "../lib/accessUnlock";

describe("accessVisibility mapping", () => {
  it("maps UI tiered to DB vip_tiered", () => {
    assert.equal(toDbVisibility("tiered"), "vip_tiered");
    assert.equal(toDbVisibility("vip_tiered"), "vip_tiered");
    assert.equal(toDbVisibility("hybrid"), "hybrid");
    assert.equal(toDbVisibility("invite_only"), "invite_only");
  });

  it("maps DB vip_tiered to UI tiered", () => {
    assert.equal(toUiAccessType("vip_tiered"), "tiered");
    assert.equal(toUiAccessType("tiered"), "tiered");
  });

  it("wizard never remaps hybrid/VIP to invite_only", () => {
    assert.equal(wizardAccessTypeToVisibility("vip_tiered"), "vip_tiered");
    assert.equal(wizardAccessTypeToVisibility("hybrid"), "hybrid");
    assert.equal(wizardAccessTypeToVisibility("invite_only"), "invite_only");
  });
});

describe("accessUnlock token", () => {
  it("mints and verifies a same-event unlock", () => {
    const token = mintAccessUnlockToken("evt-1", 1_700_000_000_000);
    assert.equal(verifyAccessUnlockToken("evt-1", token, 1_700_000_000_000 + 1000), true);
    assert.equal(verifyAccessUnlockToken("evt-2", token, 1_700_000_000_000 + 1000), false);
    assert.equal(
      verifyAccessUnlockToken("evt-1", token, 1_700_000_000_000 + 13 * 60 * 60 * 1000),
      false,
    );
  });

  it("names cookies safely", () => {
    assert.match(accessUnlockCookieName("abc-123"), /^avo_access_/);
  });
});
