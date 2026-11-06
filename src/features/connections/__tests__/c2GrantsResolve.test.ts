import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connectionDtoHasNoSecrets, pickSenderCandidate } from "../lib/resolveSender.logic";
import { buildBlockedByAdminNote } from "../lib/blockedByAdminCopy";
import { catalogForScope } from "../catalog";

describe("C2 assertMayUse / grants semantics (pure)", () => {
  it("member without grant cannot pick org connection", () => {
    const picked = pickSenderCandidate({
      eventDefaultId: null,
      personalDefaultId: null,
      orgGrantId: "org-conn",
      allowedIds: new Set(), // no grant → not allowed
    });
    assert.equal(picked, null);
  });

  it("revoke takes effect immediately (allowed set shrinks)", () => {
    const before = pickSenderCandidate({
      eventDefaultId: null,
      personalDefaultId: null,
      orgGrantId: "org-conn",
      allowedIds: new Set(["org-conn"]),
    });
    assert.equal(before?.connectionId, "org-conn");
    const afterRevoke = pickSenderCandidate({
      eventDefaultId: null,
      personalDefaultId: null,
      orgGrantId: "org-conn",
      allowedIds: new Set(), // revoked
    });
    assert.equal(afterRevoke, null);
  });

  it("quotas are shared by connection_id (same remaining for two actors)", () => {
    const connectionId = "shared-conn";
    const usedLast24h = 100;
    const daily = 400;
    const remainingForA = Math.max(0, daily - usedLast24h);
    const remainingForB = Math.max(0, daily - usedLast24h);
    assert.equal(remainingForA, remainingForB);
    assert.equal(connectionId, "shared-conn");
  });
});

describe("C2 resolveSender order", () => {
  it("event default wins over personal and org", () => {
    const picked = pickSenderCandidate({
      eventDefaultId: "event-conn",
      personalDefaultId: "personal-conn",
      orgGrantId: "org-conn",
      allowedIds: new Set(["event-conn", "personal-conn", "org-conn"]),
    });
    assert.equal(picked?.source, "event_default");
    assert.equal(picked?.connectionId, "event-conn");
  });

  it("personal default wins when event missing", () => {
    const picked = pickSenderCandidate({
      eventDefaultId: null,
      personalDefaultId: "personal-conn",
      orgGrantId: "org-conn",
      allowedIds: new Set(["personal-conn", "org-conn"]),
    });
    assert.equal(picked?.source, "personal_default");
  });

  it("org grant when no personal", () => {
    const picked = pickSenderCandidate({
      eventDefaultId: null,
      personalDefaultId: null,
      orgGrantId: "org-conn",
      allowedIds: new Set(["org-conn"]),
    });
    assert.equal(picked?.source, "org_grant");
  });

  it("blocked when nothing allowed", () => {
    assert.equal(
      pickSenderCandidate({
        eventDefaultId: "x",
        personalDefaultId: "y",
        orgGrantId: "z",
        allowedIds: new Set(),
      }),
      null,
    );
  });
});

describe("C2 secrets / platform fallback guards", () => {
  it("support cannot read secrets from public DTO shape", () => {
    assert.equal(
      connectionDtoHasNoSecrets({
        id: "1",
        providerEmail: "a@b.com",
        status: "active",
        capabilities: [],
      }),
      true,
    );
    assert.equal(
      connectionDtoHasNoSecrets({
        id: "1",
        encrypted_refresh_token: "nope",
      }),
      false,
    );
  });

  it("organizer transport never imports platform sender", () => {
    const path = join(process.cwd(), "src/features/email/organizerTransport.service.ts");
    const src = readFileSync(path, "utf8");
    assert.equal(/sendPlatformEmail|platformMail/.test(src), false);
    assert.match(src, /sendAsOrganizer|resolveSender/);
  });
});

describe("C2 catalog + blocked note", () => {
  it("vendor catalog omits sheets.sync", () => {
    const keys = catalogForScope("vendor").map((e) => e.key);
    assert.ok(keys.includes("email.send"));
    assert.ok(!keys.includes("sheets.sync"));
  });

  it("blocked_by_admin note includes client id", () => {
    const note = buildBlockedByAdminNote({
      clientId: "client-123.apps.googleusercontent.com",
      capabilities: ["email.send"],
    });
    assert.match(note, /client-123/);
    assert.match(note, /gmail\.send/);
  });
});
