import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAgendaOverlaps } from "../agendaOverlap";

const base = {
  id: "a",
  title: "Talk A",
  date: "2026-11-08",
  startTime: "10:00",
  endTime: "11:00",
  location: "Hall 1",
  speakerIds: ["s1"],
};

describe("findAgendaOverlaps", () => {
  it("warns on same location overlap", () => {
    const warnings = findAgendaOverlaps([base], {
      ...base,
      id: "b",
      title: "Talk B",
      startTime: "10:30",
      endTime: "11:30",
      speakerIds: ["s2"],
    });
    assert.equal(
      warnings.some((w) => w.kind === "location"),
      true,
    );
    assert.equal(
      warnings.some((w) => w.kind === "speaker"),
      false,
    );
  });

  it("warns on shared speaker overlap", () => {
    const warnings = findAgendaOverlaps([base], {
      ...base,
      id: "b",
      title: "Talk B",
      location: "Hall 2",
      startTime: "10:30",
      endTime: "11:30",
      speakerIds: ["s1"],
    });
    assert.equal(
      warnings.some((w) => w.kind === "speaker"),
      true,
    );
    assert.equal(
      warnings.some((w) => w.kind === "location"),
      false,
    );
  });

  it("ignores non-overlapping times", () => {
    const warnings = findAgendaOverlaps([base], {
      ...base,
      id: "b",
      startTime: "11:00",
      endTime: "12:00",
    });
    assert.equal(warnings.length, 0);
  });

  it("skips self when editing", () => {
    const warnings = findAgendaOverlaps([base], { ...base, title: "Renamed" });
    assert.equal(warnings.length, 0);
  });
});
