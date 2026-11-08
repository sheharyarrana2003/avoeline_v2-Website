import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowResubmission,
  linkSubmissionRequired,
  phaseWindowAllowsWork,
} from "../settingsEnforcement.logic";
import { filterSubmissionRows } from "../taskSubmissions.logic";
import type { TaskSubmissionRow } from "../taskSubmissions.types";

function row(partial: Partial<TaskSubmissionRow> & { id: string }): TaskSubmissionRow {
  return {
    teamId: "tm",
    teamName: "Team",
    trackId: "tr",
    trackName: "Comp",
    phaseId: null,
    phaseName: null,
    taskId: "tk",
    taskTitle: "Task",
    submittedBy: null,
    textAnswer: null,
    organizerNotes: null,
    linkUrl: null,
    extraLinks: [],
    filePath: null,
    fileName: null,
    fileSize: null,
    mime: null,
    storedFileId: null,
    submittedAt: "2026-11-08T12:00:00.000Z",
    status: "submitted",
    reviewNote: null,
    pointsAwarded: null,
    ...partial,
  };
}

describe("submission validation helpers", () => {
  it("rejects work when phase closed", () => {
    assert.equal(phaseWindowAllowsWork(false, true), false);
  });

  it("denies resubmit when allow_resubmission off", () => {
    assert.equal(allowResubmission(false, 1), false);
  });

  it("requires link when link_submissions on", () => {
    assert.equal(linkSubmissionRequired(true, false), false);
  });

  it("filterSubmissionRows returns matching only", () => {
    const rows = [
      row({ id: "1", teamName: "Alpha", trackId: "a", status: "submitted" }),
      row({ id: "2", teamName: "Beta", trackId: "b", status: "accepted", pointsAwarded: 10 }),
    ];
    const visible = filterSubmissionRows(rows, { trackId: "b", status: "accepted" });
    assert.deepEqual(
      visible.map((r) => r.id),
      ["2"],
    );
  });
});
