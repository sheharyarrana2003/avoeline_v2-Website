import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessStatusForMember,
  findMemberWithEmail,
  hasDuplicateEmailInList,
  normalizeTeamEmail,
  rolesAfterMakeLead,
} from "../organizerTeams.helpers";
import type { OrganizerAccessGrantSummary } from "../teamEngine.types";

describe("organizerTeams.helpers", () => {
  it("normalizes emails", () => {
    assert.equal(normalizeTeamEmail("  Ada@Example.COM "), "ada@example.com");
    assert.equal(normalizeTeamEmail(""), "");
  });

  it("detects duplicate emails in a list", () => {
    assert.equal(hasDuplicateEmailInList(["a@x.com", "B@x.com"], "b@x.com"), true);
    assert.equal(hasDuplicateEmailInList(["a@x.com", "B@x.com"], "b@x.com", 1), false);
    assert.equal(hasDuplicateEmailInList(["a@x.com"], ""), false);
  });

  it("finds a member with the same email", () => {
    const members = [
      { id: "1", email: "lead@avoeline.com" },
      { id: "2", email: "  Other@avoeline.com " },
    ];
    assert.equal(findMemberWithEmail(members, "other@avoeline.com")?.id, "2");
    assert.equal(findMemberWithEmail(members, "other@avoeline.com", "2"), null);
  });

  it("enforces one lead after make-lead", () => {
    const next = rolesAfterMakeLead(
      [
        { id: "a", role: "lead" as const },
        { id: "b", role: "member" as const },
        { id: "c", role: "member" as const },
      ],
      "b",
    );
    assert.deepEqual(
      next.map((m) => [m.id, m.role]),
      [
        ["a", "member"],
        ["b", "lead"],
        ["c", "member"],
      ],
    );
  });

  it("maps grant rows to access status", () => {
    const grants: OrganizerAccessGrantSummary[] = [
      {
        id: "g1",
        granteeUserId: "u1",
        scopeType: "organizer",
        scopeId: "o1",
        permissions: [],
        grantedBy: null,
        expiresAt: null,
        revokedAt: null,
        createdAt: "2026-01-01",
        inviteTokenHash: "hash",
        inviteSentAt: null,
      },
      {
        id: "g2",
        granteeUserId: "u2",
        scopeType: "organizer",
        scopeId: "o1",
        permissions: [],
        grantedBy: null,
        expiresAt: null,
        revokedAt: null,
        createdAt: "2026-01-01",
        inviteTokenHash: null,
        inviteSentAt: null,
      },
      {
        id: "g3",
        granteeUserId: "u3",
        scopeType: "organizer",
        scopeId: "o1",
        permissions: [],
        grantedBy: null,
        expiresAt: null,
        revokedAt: "2026-02-01",
        createdAt: "2026-01-01",
        inviteTokenHash: null,
        inviteSentAt: null,
      },
    ];
    assert.equal(accessStatusForMember({ userId: "" }, grants), "none");
    assert.equal(accessStatusForMember({ userId: "u1" }, grants), "invited");
    assert.equal(accessStatusForMember({ userId: "u2" }, grants), "active");
    assert.equal(accessStatusForMember({ userId: "u3" }, grants), "revoked");
    assert.equal(accessStatusForMember({ userId: "missing" }, grants), "none");
  });
});
