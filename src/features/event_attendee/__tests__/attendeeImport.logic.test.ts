import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guessColumnMap,
  mapRows,
  parseDelimitedText,
  previewMappedRows,
} from "../import/attendeeImport.logic";

describe("attendee import logic", () => {
  it("parses csv and maps email/name", () => {
    const table = parseDelimitedText("Email,Name,Phone\na@b.com,Ada,111\nb@c.com,Bob,222\n");
    assert.deepEqual(table.headers, ["Email", "Name", "Phone"]);
    const map = guessColumnMap(table.headers);
    const rows = mapRows(table, map);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.email, "a@b.com");
    const preview = previewMappedRows(rows, new Set(["b@c.com"]));
    assert.equal(preview[0]?.ok, true);
    assert.equal(preview[1]?.ok, false);
  });
});
