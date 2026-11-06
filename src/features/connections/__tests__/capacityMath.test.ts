import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSchedule,
  computeReserve,
  nextFreeAtFromTimestamps,
  nextNineAmLocal,
  nextMonthStartInTz,
  remainingBulkOf,
  remainingNowOf,
  startOfMonthInTz,
  zonedParts,
  DEFAULT_GMAIL_DAILY,
  DEFAULT_WORKSPACE_DAILY,
} from "../lib/capacityMath";
import {
  buildOrganizerUnsubscribeToken,
  parseAndVerifyOrganizerUnsubToken,
} from "../lib/suppressions.logic";

describe("capacityMath remainingNow", () => {
  it("is min of provider, plan daily, plan monthly", () => {
    assert.equal(
      remainingNowOf({
        providerRemaining: 100,
        planDailyRemaining: 50,
        planMonthlyRemaining: 200,
      }),
      50,
    );
    assert.equal(
      remainingNowOf({
        providerRemaining: 10,
        planDailyRemaining: 50,
        planMonthlyRemaining: 5,
      }),
      5,
    );
  });

  it("never goes negative", () => {
    assert.equal(
      remainingNowOf({
        providerRemaining: -1,
        planDailyRemaining: 10,
        planMonthlyRemaining: 10,
      }),
      0,
    );
  });
});

describe("capacityMath reserve", () => {
  it("keeps 20% for time-sensitive on bulk", () => {
    assert.equal(computeReserve(DEFAULT_GMAIL_DAILY), 80);
    assert.equal(computeReserve(DEFAULT_WORKSPACE_DAILY), 300);
    assert.equal(remainingBulkOf(100, 80, false), 20);
    assert.equal(remainingBulkOf(100, 80, true), 100);
  });
});

describe("capacityMath schedule", () => {
  it("builds multi-day send_and_schedule chunks", () => {
    const start = new Date("2026-11-03T04:00:00.000Z");
    const { schedule, eta } = buildSchedule({
      total: 250,
      sendNow: 50,
      startAt: start,
      timeZone: "Asia/Karachi",
      mode: "send_and_schedule",
      dailyChunk: 100,
    });
    assert.equal(schedule.length, 2);
    assert.equal(schedule[0]!.count, 100);
    assert.equal(schedule[1]!.count, 100);
    assert.ok(eta);
  });

  it("spreads evenly over days (selection leftover)", () => {
    const start = new Date("2026-11-03T04:00:00.000Z");
    const { schedule } = buildSchedule({
      total: 10,
      sendNow: 0,
      startAt: start,
      timeZone: "Asia/Karachi",
      mode: "spread_days",
      spreadDays: 3,
      dailyChunk: 100,
    });
    const sum = schedule.reduce((a, c) => a + c.count, 0);
    assert.equal(sum, 10);
    assert.equal(schedule.length, 3);
  });

  it("selection-cap style: sendNow only when remaining zero", () => {
    const { schedule } = buildSchedule({
      total: 40,
      sendNow: 40,
      startAt: new Date(),
      timeZone: "Asia/Karachi",
      mode: "send_and_schedule",
      dailyChunk: 100,
    });
    assert.equal(schedule.length, 0);
  });
});

describe("capacityMath rolling window", () => {
  it("nextFreeAt crosses midnight using oldest in window", () => {
    const now = Date.parse("2026-11-02T12:00:00.000Z");
    const stamps: string[] = [];
    for (let i = 0; i < 400; i++) {
      // fill window; oldest at T-23h
      stamps.push(new Date(now - 23 * 60 * 60 * 1000 + i * 1000).toISOString());
    }
    const free = nextFreeAtFromTimestamps(stamps, 400, now);
    assert.ok(free);
    const freeMs = Date.parse(free!);
    assert.ok(freeMs > now);
    // oldest + 24h ≈ now + 1h
    assert.ok(Math.abs(freeMs - (now + 60 * 60 * 1000)) < 60_000);
  });

  it("returns null when under daily limit", () => {
    assert.equal(nextFreeAtFromTimestamps(["2026-11-02T01:00:00.000Z"], 400), null);
  });
});

describe("capacityMath timezone", () => {
  it("next 09:00 Asia/Karachi after afternoon local", () => {
    // 2026-11-02 15:00 PKT = 10:00 UTC
    const from = new Date("2026-11-02T10:00:00.000Z");
    const next = nextNineAmLocal(from, "Asia/Karachi");
    const p = zonedParts(next, "Asia/Karachi");
    assert.equal(p.hour, 9);
    assert.equal(p.minute, 0);
    assert.ok(next.getTime() > from.getTime());
  });

  it("month boundaries in organizer TZ", () => {
    const mid = new Date("2026-11-15T08:00:00.000Z");
    const start = startOfMonthInTz(mid, "Asia/Karachi");
    const next = nextMonthStartInTz(mid, "Asia/Karachi");
    assert.equal(zonedParts(start, "Asia/Karachi").day, 1);
    assert.equal(zonedParts(start, "Asia/Karachi").month, 11);
    assert.equal(zonedParts(next, "Asia/Karachi").month, 12);
    assert.equal(zonedParts(next, "Asia/Karachi").day, 1);
  });
});

describe("organizer unsubscribe tokens", () => {
  it("round-trips and rejects tampering", () => {
    const secret = "test-secret";
    const token = buildOrganizerUnsubscribeToken({
      email: "User@Example.com",
      ownerId: "11111111-1111-1111-1111-111111111111",
      secret,
    });
    const ok = parseAndVerifyOrganizerUnsubToken(token, secret);
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.email, "user@example.com");
      assert.equal(ok.ownerId, "11111111-1111-1111-1111-111111111111");
    }
    const bad = parseAndVerifyOrganizerUnsubToken(token.slice(0, -2) + "aa", secret);
    assert.equal(bad.ok, false);
  });
});

describe("capacityMath shared-pool / mid-batch semantics", () => {
  it("shared pool is keyed by connection remaining (min-of-three)", () => {
    // Two organizers sharing one connection still see the same providerRemaining.
    const sharedProviderRemaining = 40;
    const a = remainingNowOf({
      providerRemaining: sharedProviderRemaining,
      planDailyRemaining: 200,
      planMonthlyRemaining: 1000,
    });
    const b = remainingNowOf({
      providerRemaining: sharedProviderRemaining,
      planDailyRemaining: 15,
      planMonthlyRemaining: 1000,
    });
    assert.equal(a, 40);
    assert.equal(b, 15);
  });

  it("plan limit change mid-batch shrinks remainingBulk via reserve", () => {
    const providerRemaining = 100;
    const planDailyRemaining = 30; // admin lowered plan mid-day
    const remaining = remainingNowOf({
      providerRemaining,
      planDailyRemaining,
      planMonthlyRemaining: 500,
    });
    assert.equal(remaining, 30);
    assert.equal(remainingBulkOf(remaining, computeReserve(400), false), 0);
  });

  it("circuit-breaker style resume: when used drops below limit nextFreeAt clears", () => {
    const now = Date.parse("2026-11-02T12:00:00.000Z");
    const under = Array.from({ length: 10 }, (_, i) => new Date(now - i * 60_000).toISOString());
    assert.equal(nextFreeAtFromTimestamps(under, 400, now), null);
  });

  it("idempotent retry: same schedule for same inputs", () => {
    const start = new Date("2026-11-03T04:00:00.000Z");
    const a = buildSchedule({
      total: 120,
      sendNow: 20,
      startAt: start,
      timeZone: "Asia/Karachi",
      mode: "send_and_schedule",
      dailyChunk: 50,
    });
    const b = buildSchedule({
      total: 120,
      sendNow: 20,
      startAt: start,
      timeZone: "Asia/Karachi",
      mode: "send_and_schedule",
      dailyChunk: 50,
    });
    assert.deepEqual(a, b);
  });
});
