import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decideAccess,
  inviteDisplayStatus,
  inviteRefusal,
  parseGuestList,
  type AccessFacts,
  type EventInvite,
} from "../types";

function invite(partial: Partial<EventInvite>): EventInvite {
  return {
    id: "1",
    eventId: "e1",
    email: "a@b.com",
    name: "",
    kind: "invite",
    token: "tok",
    tier: "",
    openedAt: null,
    registeredAt: null,
    registrationId: null,
    revokedAt: null,
    expiresAt: "",
    singleUse: false,
    createdAt: null,
    ...partial,
  };
}

const openBase: Omit<AccessFacts, "type"> = {
  open: true,
  hasCode: false,
  codeMatches: false,
  codeSubmitted: false,
  entry: null,
  emailKnown: false,
  guestListInUse: false,
  gatedTiers: ["VIP"],
};

describe("decideAccess", () => {
  it("allows public and tiered openly", () => {
    for (const type of ["public", "tiered"] as const) {
      const d = decideAccess({ ...openBase, type });
      assert.equal(d.allowed, true);
      if (d.allowed) assert.deepEqual(d.lockedTiers, []);
    }
  });

  it("locks hybrid gated tiers until code or entry", () => {
    const locked = decideAccess({ ...openBase, type: "hybrid" });
    assert.equal(locked.allowed, true);
    if (locked.allowed) assert.deepEqual(locked.lockedTiers, ["VIP"]);

    const withCode = decideAccess({
      ...openBase,
      type: "hybrid",
      hasCode: true,
      codeMatches: true,
      codeSubmitted: true,
    });
    assert.equal(withCode.allowed, true);
    if (withCode.allowed) assert.deepEqual(withCode.lockedTiers, []);

    const withEntry = decideAccess({
      ...openBase,
      type: "hybrid",
      entry: { kind: "invite", tier: "VIP" },
    });
    assert.equal(withEntry.allowed, true);
    if (withEntry.allowed) assert.deepEqual(withEntry.lockedTiers, []);
  });

  it("requires invite for invite_only", () => {
    const denied = decideAccess({ ...openBase, type: "invite_only" });
    assert.equal(denied.allowed, false);
    if (!denied.allowed) assert.equal(denied.reason, "needs_invite");

    const ok = decideAccess({
      ...openBase,
      type: "invite_only",
      entry: { kind: "invite", tier: "" },
    });
    assert.equal(ok.allowed, true);
  });

  it("enforces private code and whitelist at register", () => {
    const needsCode = decideAccess({
      ...openBase,
      type: "private",
      hasCode: true,
    });
    assert.equal(needsCode.allowed, false);
    if (!needsCode.allowed) assert.equal(needsCode.reason, "needs_code");

    const notListed = decideAccess({
      ...openBase,
      type: "private",
      emailKnown: true,
      guestListInUse: true,
    });
    assert.equal(notListed.allowed, false);
    if (!notListed.allowed) assert.equal(notListed.reason, "not_whitelisted");

    const whitelisted = decideAccess({
      ...openBase,
      type: "private",
      emailKnown: true,
      guestListInUse: true,
      entry: { kind: "whitelist", tier: "General" },
    });
    assert.equal(whitelisted.allowed, true);
  });

  it("refuses closed events", () => {
    const d = decideAccess({ ...openBase, type: "public", open: false });
    assert.equal(d.allowed, false);
    if (!d.allowed) assert.equal(d.reason, "closed");
  });
});

describe("inviteRefusal / inviteDisplayStatus", () => {
  it("marks revoked, expired, and single-use", () => {
    assert.equal(inviteRefusal(invite({ revokedAt: "2026-01-01T00:00:00.000Z" })), "revoked");
    assert.equal(inviteRefusal(invite({ expiresAt: "01/01/2020" })), "expired");
    assert.equal(
      inviteRefusal(invite({ singleUse: true, registeredAt: "2026-01-01T00:00:00.000Z" })),
      "already_used",
    );
    assert.equal(inviteDisplayStatus(invite({ revokedAt: "2026-01-01T00:00:00.000Z" })), "revoked");
    assert.equal(inviteDisplayStatus(invite({ openedAt: "2026-01-01T00:00:00.000Z" })), "opened");
    assert.equal(
      inviteDisplayStatus(invite({ registeredAt: "2026-01-01T00:00:00.000Z" })),
      "registered",
    );
    assert.equal(inviteDisplayStatus(invite({ kind: "whitelist" })), "not_registered");
  });
});

describe("parseGuestList", () => {
  it("reports valid, invalid, and duplicates", () => {
    const report = parseGuestList(
      "email,name\nok@ex.com,Ok\nbad\nok@ex.com,Dup\nother@ex.com,Other\n",
    );
    assert.equal(report.valid.length, 2);
    assert.equal(report.duplicates.length, 1);
    assert.equal(report.invalid.length, 1);
  });
});
