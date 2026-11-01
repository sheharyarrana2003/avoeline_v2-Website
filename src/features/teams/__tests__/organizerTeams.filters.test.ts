import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAdvancedOrganizerTeamsTab,
  organizerTeamsHref,
  paginateOrganizerTeamsList,
  parseOrganizerTeamsFilters,
  serializeOrganizerTeamsFilters,
} from "../organizerTeams.filters";
import { APPLICANT_STATUS_LABEL } from "../teamEngine.types";
import { accessGrantUiStatus } from "../teamEngine.types";
import { buildInterviewIcs } from "../interviewIcs";

describe("organizerTeams.filters", () => {
  it("round-trips URL filters", () => {
    const parsed = parseOrganizerTeamsFilters({
      tab: "recruitment",
      q: " Desk ",
      team: "t1",
      role: "lead",
      access: "active",
      page: "3",
    });
    assert.deepEqual(parsed, {
      tab: "recruitment",
      q: "desk",
      team: "t1",
      role: "lead",
      access: "active",
      page: 3,
    });
    const qs = new URLSearchParams(serializeOrganizerTeamsFilters(parsed));
    assert.equal(qs.get("tab"), "recruitment");
    assert.equal(qs.get("q"), "desk");
    assert.equal(qs.get("team"), "t1");
    assert.equal(qs.get("role"), "lead");
    assert.equal(qs.get("access"), "active");
    assert.equal(qs.get("page"), "3");
  });

  it("omits defaults from the query string", () => {
    const qs = serializeOrganizerTeamsFilters(parseOrganizerTeamsFilters({}));
    assert.equal(qs, "");
  });

  it("marks recruitment and access as advanced tabs", () => {
    assert.equal(isAdvancedOrganizerTeamsTab("teams"), false);
    assert.equal(isAdvancedOrganizerTeamsTab("recruitment"), true);
    assert.equal(isAdvancedOrganizerTeamsTab("access"), true);
  });

  it("builds href and paginates", () => {
    const href = organizerTeamsHref("/organizer/o1/teams", parseOrganizerTeamsFilters({}), {
      tab: "access",
      page: 2,
    });
    assert.ok(href.includes("tab=access"));
    assert.ok(href.includes("page=2"));
    const page = paginateOrganizerTeamsList([1, 2, 3, 4, 5], 2, 2);
    assert.deepEqual(page.pageItems, [3, 4]);
    assert.equal(page.totalPages, 3);
  });
});

describe("applicant + grant status labels", () => {
  it("labels accepted as Onboarded and includes Withdrawn", () => {
    assert.equal(APPLICANT_STATUS_LABEL.accepted, "Onboarded");
    assert.equal(APPLICANT_STATUS_LABEL.withdrawn, "Withdrawn");
  });

  it("derives grant UI status", () => {
    assert.equal(
      accessGrantUiStatus({
        revokedAt: "2026-01-02",
        expiresAt: null,
        inviteTokenHash: null,
        inviteSentAt: null,
      }),
      "revoked",
    );
    assert.equal(
      accessGrantUiStatus({
        revokedAt: null,
        expiresAt: "2000-01-01T00:00:00.000Z",
        inviteTokenHash: null,
        inviteSentAt: null,
      }),
      "expired",
    );
    assert.equal(
      accessGrantUiStatus({
        revokedAt: null,
        expiresAt: null,
        inviteTokenHash: "abc",
        inviteSentAt: null,
      }),
      "invited",
    );
    assert.equal(
      accessGrantUiStatus({
        revokedAt: null,
        expiresAt: null,
        inviteTokenHash: null,
        inviteSentAt: null,
      }),
      "active",
    );
  });
});

describe("interview ICS", () => {
  it("builds a VCALENDAR with escaped text", () => {
    const ics = buildInterviewIcs({
      title: "Interview; Desk",
      startsAt: "2026-11-01T10:00:00.000Z",
      durationMinutes: 30,
      location: "Zoom",
      description: "Bring ID",
    });
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("SUMMARY:Interview\\; Desk"));
    assert.ok(ics.includes("LOCATION:Zoom"));
  });
});
