import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canJoin, type HackathonTeamMember } from "../types";

const member = (id: string): HackathonTeamMember => ({
  registrationId: id,
  name: "A",
  email: "a@example.com",
  skills: [],
  isOwner: false,
  joinedAt: "2026-01-01T00:00:00Z",
});

const baseTeam = {
  eventId: "e1",
  trackId: "t1",
  members: [] as HackathonTeamMember[],
  maxTeamSize: 4,
  unlockedByOrganizer: false,
  feeStatus: "not_required" as const,
  eliminatedAtRound: null as number | null,
};

describe("canJoin O2 rules", () => {
  it("allows a free open team", () => {
    const d = canJoin({
      eventId: "e1",
      registrationId: "r1",
      team: baseTeam,
      track: { registrationClosesAt: "", status: "open" },
      currentTeamTrackId: null,
    });
    assert.equal(d.allowed, true);
  });

  it("blocks fee_pending teams", () => {
    const d = canJoin({
      eventId: "e1",
      registrationId: "r1",
      team: { ...baseTeam, feeStatus: "fee_pending" },
      track: { registrationClosesAt: "", status: "open" },
      currentTeamTrackId: null,
    });
    assert.equal(d.allowed, false);
    if (!d.allowed) assert.equal(d.reason, "team_not_ready");
  });

  it("blocks expired join codes", () => {
    const d = canJoin({
      eventId: "e1",
      registrationId: "r1",
      team: { ...baseTeam, members: [member("other")] },
      track: { registrationClosesAt: "", status: "open" },
      currentTeamTrackId: null,
      now: new Date("2026-11-08T00:00:00Z"),
      joinCodeValidUntil: "2026-11-07T00:00:00Z",
    });
    assert.equal(d.allowed, false);
    if (!d.allowed) assert.equal(d.reason, "join_code_expired");
  });

  it("blocks revoked join codes", () => {
    const d = canJoin({
      eventId: "e1",
      registrationId: "r1",
      team: { ...baseTeam, joinCodeRevoked: true, members: [member("other")] },
      track: { registrationClosesAt: "", status: "open" },
      currentTeamTrackId: null,
    });
    assert.equal(d.allowed, false);
    if (!d.allowed) assert.equal(d.reason, "join_code_revoked");
  });
});
