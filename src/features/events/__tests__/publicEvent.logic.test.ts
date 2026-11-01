import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dtoContainsForbiddenKey,
  filterPublicOrgCredits,
  resolveRegisterButtonState,
} from "../publicEvent.logic";
import type { PublicOrgCredit } from "../types";

const base = {
  preview: false,
  requiresRegistration: true,
  lifecycle: "published" as const,
  registrationOpen: true,
  registrationOpenDate: "",
  seatsLeft: 10 as number | null,
  waitlistEnabled: false,
  hasTracks: false,
  openCompetitionCount: 0,
};

describe("resolveRegisterButtonState", () => {
  it("returns open when registration is available", () => {
    assert.equal(resolveRegisterButtonState(base), "open");
  });

  it("returns admin_preview for draft previews", () => {
    assert.equal(
      resolveRegisterButtonState({ ...base, preview: true, lifecycle: "draft" }),
      "admin_preview",
    );
  });

  it("returns no_registration when signup is not required", () => {
    assert.equal(
      resolveRegisterButtonState({ ...base, requiresRegistration: false }),
      "no_registration",
    );
  });

  it("returns ended for completed/cancelled/archived", () => {
    assert.equal(resolveRegisterButtonState({ ...base, lifecycle: "completed" }), "ended");
    assert.equal(resolveRegisterButtonState({ ...base, lifecycle: "cancelled" }), "ended");
    assert.equal(resolveRegisterButtonState({ ...base, lifecycle: "archived" }), "ended");
  });

  it("returns competitions_closed when all tracks are closed", () => {
    assert.equal(
      resolveRegisterButtonState({ ...base, hasTracks: true, openCompetitionCount: 0 }),
      "competitions_closed",
    );
  });

  it("returns opens_at when the open date is in the future", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    assert.equal(
      resolveRegisterButtonState({
        ...base,
        registrationOpenDate: "2026-07-01",
        registrationOpen: false,
        now,
      }),
      "opens_at",
    );
  });

  it("returns closed when the window is shut", () => {
    assert.equal(resolveRegisterButtonState({ ...base, registrationOpen: false }), "closed");
  });

  it("returns waitlist or sold_out when seats are gone", () => {
    assert.equal(
      resolveRegisterButtonState({ ...base, seatsLeft: 0, waitlistEnabled: true }),
      "waitlist",
    );
    assert.equal(
      resolveRegisterButtonState({ ...base, seatsLeft: 0, waitlistEnabled: false }),
      "sold_out",
    );
  });
});

describe("dtoContainsForbiddenKey", () => {
  it("passes a scrubbed public DTO", () => {
    const dto = {
      id: "e1",
      title: "Demo",
      organizerChip: { name: "Dept" },
      sponsors: [
        { id: "s1", name: "Acme", logoUrl: "", websiteUrl: "", tier: "Gold", type: "sponsor" },
      ],
      formFields: [{ key: "name", label: "Name" }],
    };
    assert.equal(dtoContainsForbiddenKey(dto), null);
  });

  it("flags nested forbidden keys", () => {
    assert.equal(
      dtoContainsForbiddenKey({ id: "e1", access: { accessCode: "secret" } }),
      "access.accessCode",
    );
    assert.equal(
      dtoContainsForbiddenKey({ sponsors: [{ name: "X", contractValue: 1000 }] }),
      "sponsors[0].contractValue",
    );
    assert.equal(dtoContainsForbiddenKey({ meetingPassword: "x" }), "meetingPassword");
  });
});

describe("filterPublicOrgCredits", () => {
  const orgs: PublicOrgCredit[] = [
    { id: "1", name: "S", logoUrl: "", websiteUrl: "", tier: "Gold", type: "sponsor" },
    { id: "2", name: "C", logoUrl: "", websiteUrl: "", tier: "", type: "collaborator" },
    { id: "3", name: "P", logoUrl: "", websiteUrl: "", tier: "", type: "partner" },
  ];

  it("hides all groups when toggles are off", () => {
    const out = filterPublicOrgCredits(orgs, {
      showSponsors: false,
      showCollaborators: false,
      showPartners: false,
    });
    assert.equal(out.sponsors.length, 0);
    assert.equal(out.collaborators.length, 0);
    assert.equal(out.partners.length, 0);
  });

  it("includes only toggled groups", () => {
    const out = filterPublicOrgCredits(orgs, {
      showSponsors: true,
      showCollaborators: false,
      showPartners: true,
    });
    assert.deepEqual(
      out.sponsors.map((o) => o.id),
      ["1"],
    );
    assert.equal(out.collaborators.length, 0);
    assert.deepEqual(
      out.partners.map((o) => o.id),
      ["3"],
    );
  });
});
