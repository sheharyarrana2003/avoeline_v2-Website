import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasLimitedCapacity,
  organizerHackathonAdmissionLabel,
  organizerTierAdmissionLabel,
  overviewAgendaSummary,
  overviewRegistrationWindow,
} from "../overviewFacts";

describe("overviewFacts", () => {
  it("treats zero/missing seats as unlimited capacity", () => {
    assert.equal(hasLimitedCapacity(0), false);
    assert.equal(hasLimitedCapacity(null), false);
    assert.equal(hasLimitedCapacity(100), true);
  });

  it("builds full registration windows", () => {
    assert.equal(overviewRegistrationWindow({ opens: null, closes: null }), null);
    assert.match(
      String(overviewRegistrationWindow({ opens: "2026-11-01", closes: "2026-11-20" })),
      /Opens.*closes/i,
    );
  });

  it("builds hackathon fee ranges", () => {
    assert.equal(organizerHackathonAdmissionLabel([]), "No competitions yet");
    assert.equal(
      organizerHackathonAdmissionLabel([
        { name: "A", fee: 0 },
        { name: "B", fee: 0 },
      ]),
      "Free",
    );
    assert.match(
      organizerHackathonAdmissionLabel([
        { name: "A", fee: 500, currency: "PKR" },
        { name: "B", fee: 1500, currency: "PKR" },
      ]),
      /500.*1500|1,500/,
    );
  });

  it("builds tier admission labels", () => {
    assert.equal(organizerTierAdmissionLabel({ isFree: true }), "Free");
    assert.match(
      organizerTierAdmissionLabel({
        tiers: [{ price: 100 }, { price: 300 }],
        currency: "PKR",
      }),
      /100.*300/,
    );
  });

  it("hides empty agenda summaries", () => {
    assert.equal(overviewAgendaSummary([]), null);
    const s = overviewAgendaSummary([
      {
        sessionId: "1",
        title: "Open",
        type: "talk",
        status: "confirmed",
        date: "2026-11-10",
        startTime: "10:00",
        endTime: "11:00",
        duration: "",
        timezone: "",
        location: "",
        room: "",
        building: "",
        floor: "",
        capacity: 0,
        speakerNames: [],
        description: "",
        activities: [],
        notes: "",
        recordingUrl: "",
        feedbackFormUrl: "",
        isRecordingAvailable: false,
        isRegistrationRequired: false,
        maxAttendees: 0,
        currentAttendees: 0,
        customFields: {},
      },
    ]);
    assert.ok(s);
    assert.equal(s!.count, 1);
    assert.match(s!.value, /1 session/);
    assert.match(String(s!.sub), /Day 1 starts/i);
  });
});
