import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pauseMessage,
  pauseReasonFromHttp,
  sanitizeSheetCell,
  sanitizeSheetMatrix,
  sheetRowsFingerprint,
  shouldRewriteSheet,
} from "../lib/sheetSanitize";
import {
  chunkSheetRows,
  classifySheetWriteFailure,
  computeGoogleRetryWaitMs,
  GOOGLE_FETCH_MAX_RETRIES,
  quotaDeferMessage,
  sheetChunkRange,
  SHEET_WRITE_CHUNK_ROWS,
} from "../lib/sheetWrite.logic";
import {
  mouDraftBody,
  runOfShowBody,
  sponsorTrackerHeaders,
  templateTitle,
} from "../lib/templates.logic";

describe("C5 sheet formula injection", () => {
  it("prefixes dangerous leading characters", () => {
    assert.equal(sanitizeSheetCell("=CMD()"), "'=CMD()");
    assert.equal(sanitizeSheetCell("+1+1"), "'+1+1");
    assert.equal(sanitizeSheetCell("-1+1"), "'-1+1");
    assert.equal(sanitizeSheetCell("@SUM(A1)"), "'@SUM(A1)");
    assert.equal(sanitizeSheetCell("\t=HID"), "'\t=HID");
    assert.equal(sanitizeSheetCell("\r=HID"), "'\r=HID");
    assert.equal(sanitizeSheetCell("hello"), "hello");
    assert.equal(sanitizeSheetCell(42), 42);
  });

  it("fingerprint skips unchanged matrices (idempotency)", () => {
    const a = sanitizeSheetMatrix([
      ["Name", "Email"],
      ["Ada", "ada@example.com"],
    ]);
    const fp = sheetRowsFingerprint(a);
    assert.equal(shouldRewriteSheet({ previousFingerprint: fp, nextFingerprint: fp }), false);
    assert.equal(
      shouldRewriteSheet({
        previousFingerprint: fp,
        nextFingerprint: sheetRowsFingerprint([["x"]]),
      }),
      true,
    );
  });

  it("chunking preserves fingerprint of full matrix", () => {
    const matrix = Array.from({ length: SHEET_WRITE_CHUNK_ROWS + 3 }, (_, i) => [`r${i}`, i]);
    const chunks = chunkSheetRows(matrix, SHEET_WRITE_CHUNK_ROWS);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].length, SHEET_WRITE_CHUNK_ROWS);
    assert.equal(chunks[1].length, 3);
    const rebuilt = chunks.flat();
    assert.equal(sheetRowsFingerprint(rebuilt), sheetRowsFingerprint(matrix));
    assert.equal(sheetChunkRange("Sheet1", 1, 10), "Sheet1!A1:A10");
    assert.equal(sheetChunkRange("Sheet1", 401, 3), "Sheet1!A401:A403");
  });

  it("pause messages for deleted / revoked sheets", () => {
    assert.match(pauseMessage("missing"), /deleted/i);
    assert.match(pauseMessage("no_access"), /revoked|access/i);
    assert.equal(pauseReasonFromHttp(404), "missing");
    assert.equal(pauseReasonFromHttp(403), "no_access");
    assert.equal(pauseReasonFromHttp(401), "no_access");
  });

  it("classifies write failures: pause vs defer", () => {
    assert.equal(classifySheetWriteFailure(404), "pause");
    assert.equal(classifySheetWriteFailure(403), "pause");
    assert.equal(classifySheetWriteFailure(401), "pause");
    assert.equal(classifySheetWriteFailure(429), "defer");
    assert.equal(classifySheetWriteFailure(503), "defer");
    assert.equal(classifySheetWriteFailure(400), "error");
    assert.match(quotaDeferMessage(), /quota/i);
  });

  it("computes Google retry wait with backoff and Retry-After", () => {
    assert.equal(computeGoogleRetryWaitMs(200, 0), null);
    assert.equal(computeGoogleRetryWaitMs(429, 0, 12_000), 12_000);
    assert.equal(computeGoogleRetryWaitMs(429, 0), 500);
    assert.equal(computeGoogleRetryWaitMs(503, 1), 1000);
    assert.equal(computeGoogleRetryWaitMs(429, GOOGLE_FETCH_MAX_RETRIES), null);
  });
});

describe("C5 templates", () => {
  it("builds titles and bodies", () => {
    assert.match(templateTitle("run_of_show", "Spring Fest"), /Run of show/);
    assert.match(
      runOfShowBody({ eventTitle: "X", startDate: "1", endDate: "2", venue: "Hall" }),
      /Timeline|No agenda/,
    );
    assert.match(
      runOfShowBody({
        eventTitle: "X",
        startDate: "1",
        endDate: "2",
        venue: "Hall",
        agendaLines: [
          {
            date: "2026-11-01",
            startTime: "09:00",
            endTime: "10:00",
            title: "Keynote",
            location: "Main",
          },
        ],
      }),
      /Keynote/,
    );
    assert.match(mouDraftBody({ eventTitle: "X", organizerName: "Org" }), /Memorandum/);
    assert.ok(sponsorTrackerHeaders().includes("Sponsor / partner"));
  });
});
