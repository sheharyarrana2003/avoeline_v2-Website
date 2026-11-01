import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Registration } from "@/src/services/models/reg.type";
import {
  countOrganizerEventStatuses,
  deleteRequiresTitleConfirm,
  filterOrganizerEvents,
  listRowTitleNodes,
  parseOrganizerEventFilters,
  serializeOrganizerEventFilters,
  sortOrganizerEvents,
  type OrganizerEventListItem,
} from "../organizerEvents.filters";
import { occupancyCount, occupyingRegsForEvent } from "../organizerEvents.occupancy";

function item(
  partial: Partial<OrganizerEventListItem> & Pick<OrganizerEventListItem, "id" | "title">,
): OrganizerEventListItem {
  return {
    category: null,
    eventType: null,
    venueName: null,
    city: null,
    isHackathon: false,
    lifecycle: "upcoming",
    createdAtMs: 0,
    startAtMs: null,
    registrations: 0,
    ...partial,
  };
}

function reg(
  partial: Partial<Registration> & Pick<Registration, "registrationId" | "eventId">,
): Registration {
  return {
    userId: "",
    attendee: null,
    organizerId: "org1",
    registrationDate: new Date().toISOString(),
    registrationSource: "web",
    status: "confirmed",
    statusHistory: [],
    payment: {
      paymentId: "",
      amountPaid: 0,
      currency: "PKR",
      paymentMethod: "free_ticket",
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
    finalPrice: 0,
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

describe("organizerEvents.filters URL round-trip", () => {
  it("parses and serializes kind, status, sort, view, page, q", () => {
    const qs = "kind=hackathon&status=upcoming&sort=starts_soon&view=grid&page=3&q=campus";
    const filters = parseOrganizerEventFilters(new URLSearchParams(qs));
    assert.equal(filters.kind, "hackathon");
    assert.equal(filters.status, "upcoming");
    assert.equal(filters.sort, "starts_soon");
    assert.equal(filters.view, "grid");
    assert.equal(filters.page, 3);
    assert.equal(filters.q, "campus");

    const again = parseOrganizerEventFilters(
      new URLSearchParams(serializeOrganizerEventFilters(filters)),
    );
    assert.equal(again.kind, filters.kind);
    assert.equal(again.status, filters.status);
    assert.equal(again.sort, filters.sort);
    assert.equal(again.view, filters.view);
    assert.equal(again.page, filters.page);
    assert.equal(again.q, filters.q);
  });

  it("omits defaults from the query string", () => {
    const qs = serializeOrganizerEventFilters(parseOrganizerEventFilters({}));
    assert.equal(qs, "");
  });
});

describe("organizerEvents status counts + filter", () => {
  const items = [
    item({ id: "1", title: "A", lifecycle: "upcoming", isHackathon: false }),
    item({ id: "2", title: "B Hack", lifecycle: "upcoming", isHackathon: true }),
    item({ id: "3", title: "C", lifecycle: "archived", isHackathon: false }),
    item({ id: "4", title: "D", lifecycle: "draft", isHackathon: false }),
  ];

  it("counts live vs archived and excludes archived from all", () => {
    const counts = countOrganizerEventStatuses(items, { kind: "all", q: "" });
    assert.equal(counts.all, 3);
    assert.equal(counts.archived, 1);
    assert.equal(counts.upcoming, 2);
    assert.equal(counts.draft, 1);
  });

  it("filters by kind and status", () => {
    const hacks = filterOrganizerEvents(items, {
      kind: "hackathon",
      status: "all",
      q: "",
      sort: "newest",
      view: "list",
      page: 1,
    });
    assert.equal(hacks.length, 1);
    assert.equal(hacks[0]?.id, "2");
  });

  it("sorts by most registrations", () => {
    const sorted = sortOrganizerEvents(
      [
        item({ id: "a", title: "a", registrations: 2, createdAtMs: 1 }),
        item({ id: "b", title: "b", registrations: 9, createdAtMs: 2 }),
      ],
      "most_registrations",
    );
    assert.deepEqual(
      sorted.map((x) => x.id),
      ["b", "a"],
    );
  });
});

describe("list row title once", () => {
  it("title appears once when thumb hides title", () => {
    const nodes = listRowTitleNodes({ title: "Campus Summit", showThumbTitle: false });
    assert.equal(nodes.filter((n) => n === "Campus Summit").length, 1);
  });

  it("title would appear twice if thumb also showed it", () => {
    const nodes = listRowTitleNodes({ title: "Campus Summit", showThumbTitle: true });
    assert.equal(nodes.filter((n) => n === "Campus Summit").length, 2);
  });
});

describe("occupancy team = one reg", () => {
  it("team of 2 → occupancy 1", () => {
    const lead = reg({
      registrationId: "r-lead",
      eventId: "ev1",
      hackathonRole: "team_lead",
    });
    const member = reg({
      registrationId: "r-member",
      eventId: "ev1",
      hackathonRole: "participant",
    });
    const teams = [
      {
        members: [
          { registrationId: "r-lead", isOwner: true },
          { registrationId: "r-member", isOwner: false },
        ],
      },
    ];
    assert.equal(
      occupancyCount({
        regs: [lead, member],
        isHackathon: true,
        allowGroupRegistration: false,
        teams,
      }),
      1,
    );
    assert.equal(
      occupyingRegsForEvent({
        regs: [lead, member],
        isHackathon: true,
        allowGroupRegistration: false,
        teams,
      })[0]?.registrationId,
      "r-lead",
    );
  });
});

describe("delete / archive confirm helpers", () => {
  it("requires title confirm when registrations > 0", () => {
    assert.equal(deleteRequiresTitleConfirm(0), false);
    assert.equal(deleteRequiresTitleConfirm(1), true);
    assert.equal(deleteRequiresTitleConfirm(12), true);
  });
});
