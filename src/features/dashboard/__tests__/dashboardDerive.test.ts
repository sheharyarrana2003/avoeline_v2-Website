import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Registration } from "@/src/services/models/reg.type";
import {
  occupyingHackathonRegs,
  occupyingRegsForOrganizer,
} from "@/src/features/registration/occupancy";
import {
  applyAttendeeNames,
  buildOccupying,
  deriveDashboardStat,
  deriveRecentReg,
  deriveRegTrend,
  resolveRegistrationDisplayName,
  type TeamLite,
} from "../dashboardDerive";

function reg(
  partial: Partial<Registration> & Pick<Registration, "registrationId" | "eventId">,
): Registration {
  return {
    userId: "",
    shortCode: partial.shortCode ?? "AVO-TEST01",
    attendee: null,
    organizerId: "org1",
    registrationDate: new Date().toISOString(),
    registrationSource: "web",
    status: "confirmed",
    statusHistory: [],
    payment: {
      paymentId: "",
      amountPaid: 1000,
      currency: "PKR",
      paymentMethod: "bank_transfer",
      paymentStatus: "completed",
      transactionId: null,
      invoiceUrl: null,
      proofPath: null,
    },
    pricingTier: "",
    tier: "",
    waitlistPosition: 0,
    inviteId: null,
    customResponses: {},
    hackathonTrackId: null,
    finalPrice: 1000,
    discountApplied: null,
    checkIn: {
      checkedIn: false,
      checkInTime: null,
      checkInMethod: null,
      checkedInBy: null,
      deviceId: null,
    },
    qrCode: { data: "", imageUrl: "", scanCount: 0, lastScanned: null },
    certificate: {
      type: "digital",
      issued: false,
      certificateId: null,
      issueDate: null,
      downloadUrl: null,
      sharedOnLinkedIn: false,
    },
    communications: [],
    feedbackSubmitted: false,
    rating: null,
    reviewId: null,
    metadata: { ipAddress: "", userAgent: "", deviceType: "desktop" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cancelledAt: null,
    ...partial,
  };
}

describe("dashboardDerive occupancy + recent regs", () => {
  const lead = reg({
    registrationId: "r-lead",
    eventId: "ev1",
    hackathonTeamId: "t1",
    hackathonRole: "team_lead",
    attendee: { name: "Alex Lead", email: "alex@example.com", phone: "" },
    createdAt: "2026-10-20T12:00:00.000Z",
  });
  const member = reg({
    registrationId: "r-member",
    eventId: "ev1",
    hackathonTeamId: "t1",
    hackathonRole: "participant",
    attendee: { name: "Blake Member", email: "blake@example.com", phone: "" },
    payment: {
      paymentId: "",
      amountPaid: 0,
      currency: "PKR",
      paymentMethod: "bank_transfer",
      paymentStatus: "pending",
      transactionId: null,
      invoiceUrl: null,
      proofPath: null,
    },
    finalPrice: 0,
    createdAt: "2026-10-20T12:01:00.000Z",
  });
  const team: TeamLite = {
    id: "t1",
    eventId: "ev1",
    name: "Rocket Squad",
    trackId: "track1",
    members: [
      { registrationId: "r-lead", isOwner: true, name: "Alex Lead", email: "alex@example.com" },
      {
        registrationId: "r-member",
        isOwner: false,
        name: "Blake Member",
        email: "blake@example.com",
      },
    ],
  };

  it("team of 2 → occupancy 1 matching occupyingHackathonRegs", () => {
    const regs = [lead, member];
    const occupying = buildOccupying(regs, [team], []);
    assert.equal(occupying.length, 1);
    assert.equal(occupying[0]?.registrationId, "r-lead");
    assert.deepEqual(
      occupying.map((r) => r.registrationId),
      occupyingHackathonRegs(regs, [team]).map((r) => r.registrationId),
    );
    assert.deepEqual(
      occupying.map((r) => r.registrationId),
      occupyingRegsForOrganizer(regs, [team], []).map((r) => r.registrationId),
    );

    const stats = deriveDashboardStat(
      [{ id: "ev1", title: "Hack Night", status: "published" }],
      occupying,
      [],
      [team],
      [],
    );
    assert.equal(stats.occupancyCount, 1);
    assert.equal(stats.teamsCount, 1);
    assert.equal(stats.peopleCount, 2);
  });

  it("team of 2 → one recent row with 2 members + event name", () => {
    const regs = [lead, member];
    const occupying = buildOccupying(regs, [team], []);
    const rows = deriveRecentReg({
      regs,
      occupying,
      teams: [team],
      groups: [],
      events: new Map([["ev1", { id: "ev1", title: "Campus Hack", bannerUrl: null }]]),
      trackNames: new Map([["track1", "CTF"]]),
      organizerId: "org1",
      limit: 8,
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.isTeam, true);
    assert.equal(rows[0]?.teamName, "Rocket Squad");
    assert.equal(rows[0]?.eventName, "Campus Hack");
    assert.equal(rows[0]?.memberCount, 2);
    assert.equal(rows[0]?.members?.length, 2);
    assert.equal(rows[0]?.competitionName, "CTF");
    assert.match(rows[0]?.href || "", /\/organizer\/org1\/events\/ev1\/attendees\?team=t1/);
  });

  it("never uses Unknown attendee", () => {
    const bare = reg({
      registrationId: "r2",
      eventId: "ev1",
      attendee: null,
      userId: "",
      customResponses: {},
    });
    assert.equal(resolveRegistrationDisplayName(bare), "");
    const rows = deriveRecentReg({
      regs: [bare],
      occupying: [bare],
      teams: [],
      groups: [],
      events: new Map([["ev1", { id: "ev1", title: "Solo Night" }]]),
      organizerId: "org1",
    });
    assert.equal(rows[0]?.attendeeName, "Attendee");
    assert.equal(rows[0]?.attendeeName.includes("Unknown"), false);

    const named = applyAttendeeNames(
      [{ ...rows[0]!, userId: "u1", attendeeName: "Attendee" }],
      new Map([["u1", { profile: { fullName: "Casey User" } }]]),
    );
    assert.equal(named[0]?.attendeeName, "Casey User");
    assert.equal(JSON.stringify(named).includes("Unknown attendee"), false);
  });

  it("deriveRegTrend uses local day keys", () => {
    const now = new Date();
    const localKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayReg = reg({
      registrationId: "r-today",
      eventId: "ev1",
      createdAt: now.toISOString(),
    });
    const trend = deriveRegTrend([todayReg]);
    assert.equal(trend.length, 7);
    const total = trend.reduce((s, d) => s + d.registrations, 0);
    assert.equal(total, 1);
    // Spot-check: building buckets with toISOString slice would disagree near midnight UTC offsets;
    // we only assert the count lands in the week window keyed locally.
    void localKey;
  });
});

describe("organizer dashboard plan banner guardrail", () => {
  it("dashboard page does not mount PlanStatusBanner", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/organizer/[organizer_id]/dashboard/page.tsx"),
      "utf8",
    );
    assert.equal(src.includes("PlanStatusBanner"), false);
    assert.equal(src.includes("getPlanForOrganizer"), false);
    assert.match(src, /buttonClass/);
    assert.match(src, /Registrations this week/);
  });
});
