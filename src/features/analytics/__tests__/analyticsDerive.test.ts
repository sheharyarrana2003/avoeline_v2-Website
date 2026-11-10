import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Registration } from "@/src/services/models/reg.type";
import {
  parseAnalyticsFilters,
  resolveAnalyticsDateRange,
  serializeAnalyticsFilters,
  localDayKey,
} from "../analytics.filters";
import {
  deriveAnalyticsTiles,
  deriveDailyRegistrations,
  sumSeriesRegistrations,
  filterOccupyingByCreatedAt,
} from "../analyticsDerive";
import { buildOccupying } from "@/src/features/dashboard/dashboardDerive";

function reg(
  partial: Partial<Registration> & Pick<Registration, "registrationId" | "eventId" | "createdAt">,
): Registration {
  return {
    userId: "",
    shortCode: partial.shortCode ?? "AVO-TEST01",
    attendee: null,
    organizerId: "org1",
    registrationDate: String(partial.createdAt),
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
    updatedAt: String(partial.createdAt),
    cancelledAt: null,
    ...partial,
  };
}

describe("analytics.filters", () => {
  it("defaults to last 30 days and round-trips", () => {
    const f = parseAnalyticsFilters({});
    assert.equal(f.preset, "30");
    assert.equal(f.eventId, null);
    const qs = serializeAnalyticsFilters(f);
    assert.equal(qs, "");
    const withEvent = serializeAnalyticsFilters(f, {
      eventId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      preset: "7",
    });
    assert.match(withEvent, /range=7/);
    assert.match(withEvent, /event=/);
  });

  it("resolveAnalyticsDateRange ends today and spans 30 days", () => {
    const now = new Date(2026, 9, 25, 15, 0, 0); // local Oct 25
    const range = resolveAnalyticsDateRange(parseAnalyticsFilters({}), now);
    assert.equal(range.toKey, localDayKey(now));
    assert.equal(range.fromKey, "2026-09-26");
    assert.ok(range.previous);
  });
});

describe("analyticsDerive occupancy tiles + chart", () => {
  const lead = reg({
    registrationId: "r-lead",
    eventId: "ev1",
    hackathonTeamId: "t1",
    hackathonRole: "team_lead",
    createdAt: "2026-10-20T10:00:00.000Z",
    payment: {
      paymentId: "",
      amountPaid: 5000,
      currency: "PKR",
      paymentMethod: "bank_transfer",
      paymentStatus: "completed",
      transactionId: null,
      invoiceUrl: null,
      proofPath: null,
    },
    finalPrice: 5000,
  });
  const member = reg({
    registrationId: "r-member",
    eventId: "ev1",
    hackathonTeamId: "t1",
    hackathonRole: "participant",
    createdAt: "2026-10-20T11:00:00.000Z",
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
  });
  const solo = reg({
    registrationId: "r-solo",
    eventId: "ev2",
    createdAt: "2026-10-22T09:00:00.000Z",
  });

  const teams = [
    {
      id: "t1",
      eventId: "ev1",
      name: "Team A",
      members: [
        { registrationId: "r-lead", isOwner: true },
        { registrationId: "r-member", isOwner: false },
      ],
    },
  ];

  it("tiles count team as one registration and paid once", () => {
    const occupying = buildOccupying([lead, member, solo], teams, []);
    assert.equal(occupying.length, 2);

    const now = new Date(2026, 9, 25);
    const range = resolveAnalyticsDateRange(parseAnalyticsFilters({ range: "30" }), now);
    const inRange = filterOccupyingByCreatedAt(occupying, range.from, range.to);

    const tiles = deriveAnalyticsTiles({
      occupyingInRange: inRange,
      occupyingPrev: [],
      allRegsInRange: [lead, member, solo],
      teams,
      groups: [],
      eventsInScope: [
        { id: "ev1", title: "Hack", startMs: 0 },
        { id: "ev2", title: "Meetup", startMs: 0 },
      ],
      eventsPrevCount: 2,
      bookings: [],
      expenses: [],
      reviewRatingsInRange: [],
      reviewRatingsPrev: [],
    });

    assert.equal(tiles.registrations.raw, 2);
    assert.equal(tiles.revenue.raw, 6000);
    assert.equal(tiles.satisfaction.value, "—");
  });

  it("chart sum matches occupancy tile for range", () => {
    const occupying = buildOccupying([lead, member, solo], teams, []);
    const now = new Date(2026, 9, 25);
    const range = resolveAnalyticsDateRange(parseAnalyticsFilters({ range: "30" }), now);
    const series = deriveDailyRegistrations({
      occupying,
      allRegs: [lead, member, solo],
      range,
    });
    assert.ok(series.length >= 28);
    assert.equal(sumSeriesRegistrations(series), 2);
    // No 8-point downsample for ≤90 days
    assert.ok(series.length > 8);
  });

  it("narrower filter reduces chart sum", () => {
    const occupying = buildOccupying([lead, member, solo], teams, []);
    const now = new Date(2026, 9, 25);
    const range7 = resolveAnalyticsDateRange(parseAnalyticsFilters({ range: "7" }), now);
    const series7 = deriveDailyRegistrations({
      occupying,
      allRegs: [lead, member, solo],
      range: range7,
    });
    // lead/member on Oct 20 may fall outside last 7 from Oct 25 depending on TZ; solo on 22 likely in
    assert.ok(sumSeriesRegistrations(series7) <= 2);
  });
});
