import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertUtcIsoPayload,
  competitionDatesFromForm,
  looksLikeSlashDate,
  validateCompetitionDateOrder,
  validatePhaseWindow,
} from "../competitionDates";
import { fromEventLocalInput, toEventLocalInput } from "@/src/lib/datetime";

describe("competitionDates / timezone helpers", () => {
  it("fromEventLocalInput returns UTC ISO, never slash dates", () => {
    const iso = fromEventLocalInput("2026-10-12T15:30", "Asia/Karachi");
    assert.ok(iso);
    assert.match(iso!, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(looksLikeSlashDate(iso), false);
    // 15:30 PKT = 10:30 UTC
    assert.equal(iso, "2026-10-12T10:30:00.000Z");
  });

  it("round-trips datetime-local in Asia/Karachi", () => {
    const local = "2026-11-01T09:00";
    const iso = fromEventLocalInput(local, "Asia/Karachi");
    assert.equal(toEventLocalInput(iso, "Asia/Karachi"), local);
  });

  it("competitionDatesFromForm never emits slash dates (regression for saveTrack)", () => {
    const dates = competitionDatesFromForm(
      {
        registrationClosesAt: "2026-10-01T10:00",
      },
      "Asia/Karachi",
    );
    assert.equal(looksLikeSlashDate(dates.registrationClosesAt), false);
    assert.doesNotThrow(() => assertUtcIsoPayload(dates));
  });

  it("rejects invalid registration closes", () => {
    const err = validateCompetitionDateOrder({
      registrationClosesAt: "not-a-date",
    });
    assert.equal(err?.field, "registrationClosesAt");
  });

  it("skips null registration closes", () => {
    assert.equal(validateCompetitionDateOrder({ registrationClosesAt: null }), null);
  });

  it("validatePhaseWindow rejects closes before opens", () => {
    const msg = validatePhaseWindow("2026-10-05T10:00:00.000Z", "2026-10-01T10:00:00.000Z");
    assert.match(msg || "", /on or after/i);
  });
});
