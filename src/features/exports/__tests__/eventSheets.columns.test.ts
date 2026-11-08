import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attendeeColumns, attendeeLeadColumns, attendeeMemberColumns } from "../eventSheets";

describe("eventSheets columns", () => {
  it("appends form-field columns for attendees", () => {
    const cols = attendeeColumns(
      [{ fieldId: "shirt", label: "Shirt", type: "text", required: false, options: [] }] as never,
      { ticketUrl: () => "https://x/ticket" },
    );
    assert.ok(cols.some((c) => c.header === "Shirt"));
    assert.ok(cols.some((c) => /ticket/i.test(c.header)));
  });

  it("includes Competition on team sheets", () => {
    assert.ok(attendeeLeadColumns.some((c) => c.header === "Competition"));
    assert.ok(attendeeMemberColumns([]).some((c) => c.header === "Competition"));
  });
});
