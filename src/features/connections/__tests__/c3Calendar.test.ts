import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIcs,
  displayInTimeZone,
  googleCalendarTemplateUrl,
  sanitizeCalendarText,
  sanitizeHeaderValue,
  stableMeetRequestId,
  toUtcStamp,
} from "../lib/calendarFallbacks";
import {
  idempotentRequestId,
  maySyncCalendar,
  nextLinkStatusAfterDelete,
  nextLinkStatusAfterUpsert,
  resolveMeetUrlAfterPoll,
  shouldCreateVsUpdate,
  toGoogleUtcIso,
} from "../lib/calendarSync.logic";

describe("C3 calendar sync state machine", () => {
  it("idempotent create keeps one requestId", () => {
    const computed = stableMeetRequestId("conn-1", "interview", "app-9");
    assert.equal(idempotentRequestId(null, computed), computed);
    assert.equal(idempotentRequestId("existing-rid", computed), "existing-rid");
    assert.equal(shouldCreateVsUpdate(null), "create");
    assert.equal(shouldCreateVsUpdate("gcal-evt-1"), "update");
  });

  it("update and cancel propagate statuses", () => {
    assert.equal(
      nextLinkStatusAfterUpsert({ hadGoogleEventId: true, meetPending: false }),
      "synced",
    );
    assert.equal(
      nextLinkStatusAfterUpsert({
        hadGoogleEventId: true,
        meetPending: false,
        error: "boom",
      }),
      "error",
    );
    assert.equal(nextLinkStatusAfterDelete({ googleDeleted: true }), "deleted");
    assert.equal(nextLinkStatusAfterDelete({ googleDeleted: false, error: "x" }), "error");
  });

  it("pending Meet polls then resolves", () => {
    assert.deepEqual(resolveMeetUrlAfterPoll({ attempts: 1, maxAttempts: 3, meetUrl: null }), {
      meetUrl: null,
      stillPending: true,
    });
    assert.deepEqual(
      resolveMeetUrlAfterPoll({
        attempts: 2,
        maxAttempts: 3,
        meetUrl: "https://meet.google.com/abc",
      }),
      { meetUrl: "https://meet.google.com/abc", stillPending: false },
    );
    assert.equal(
      nextLinkStatusAfterUpsert({ hadGoogleEventId: false, meetPending: true }),
      "pending",
    );
  });

  it("stores UTC ISO and displays in timezone", () => {
    const iso = toGoogleUtcIso("2026-11-02T10:00:00+05:00");
    assert.match(iso, /Z$/);
    assert.equal(toUtcStamp(new Date("2026-11-02T05:00:00.000Z")), "20261102T050000Z");
    const shown = displayInTimeZone("2026-11-02T05:00:00.000Z", "Asia/Karachi");
    assert.ok(shown.length > 0);
  });

  it("fails closed without capability or grant", () => {
    assert.equal(
      maySyncCalendar({ hasCalendarCapability: false, isOwner: true, hasGrant: false }),
      false,
    );
    assert.equal(
      maySyncCalendar({ hasCalendarCapability: true, isOwner: false, hasGrant: false }),
      false,
    );
    assert.equal(
      maySyncCalendar({ hasCalendarCapability: true, isOwner: false, hasGrant: true }),
      true,
    );
    assert.equal(
      maySyncCalendar({ hasCalendarCapability: true, isOwner: true, hasGrant: false }),
      true,
    );
  });
});

describe("C3 ICS + Google TEMPLATE sanitizing", () => {
  it("strips ICS / header injection", () => {
    const dirty = "Meet\r\nDESCRIPTION:injected\u0000;evil,more";
    const cal = sanitizeCalendarText(dirty);
    assert.ok(!cal.includes("\r"));
    assert.ok(!cal.includes("\n") || cal.includes("\\n"));
    assert.ok(!cal.includes("\u0000"));
    const hdr = sanitizeHeaderValue("Title\r\nX-Injected: yes");
    assert.ok(!hdr.includes("\n"));
    assert.ok(!hdr.includes("\r"));
  });

  it("buildIcs and google TEMPLATE url are safe", () => {
    const start = new Date("2026-11-02T05:00:00.000Z");
    const end = new Date("2026-11-02T06:00:00.000Z");
    const ics = buildIcs({
      uid: "evt-1\r\nX-Evil:1",
      title: "Talk\nBad",
      description: "Line1\nLine2",
      location: "Hall;A",
      start,
      end,
    });
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(!ics.includes("\r\nX-Evil"));
    const url = googleCalendarTemplateUrl({
      uid: "evt-1",
      title: "Talk\r\nInject",
      start,
      end,
    });
    assert.ok(url.startsWith("https://calendar.google.com/calendar/render?"));
    assert.ok(url.includes("action=TEMPLATE"));
    assert.ok(!url.includes("%0A") || !decodeURIComponent(url).includes("\nX-"));
  });
});
