import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checklistTemplateId, sanitizeChecklistTemplateItems } from "../categoryEngine.types";

describe("checklist template helpers", () => {
  it("builds a stable template id from category + format", () => {
    assert.equal(checklistTemplateId("education", "hackathon"), "education_hackathon");
    assert.equal(checklistTemplateId("  a  ", " b "), "a_b");
  });

  it("sanitizes titles, coerces offsets, and drops blanks", () => {
    const out = sanitizeChecklistTemplateItems([
      { title: "  Confirm AV  ", dueOffsetDays: -7 },
      { title: "", dueOffsetDays: 3 },
      { title: "   ", dueOffsetDays: 0 },
      { title: "Day-of briefing", dueOffsetDays: "0" as unknown as number },
      { title: "Bad offset", dueOffsetDays: Number.NaN },
      null,
      undefined,
      { title: "Fractional", dueOffsetDays: 2.9 },
    ]);
    assert.deepEqual(out, [
      { title: "Confirm AV", dueOffsetDays: -7 },
      { title: "Day-of briefing", dueOffsetDays: 0 },
      { title: "Bad offset", dueOffsetDays: 0 },
      { title: "Fractional", dueOffsetDays: 2 },
    ]);
  });

  it("returns empty array for non-arrays", () => {
    assert.deepEqual(sanitizeChecklistTemplateItems(null as unknown as []), []);
  });
});
