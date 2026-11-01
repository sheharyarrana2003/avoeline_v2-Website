/**
 * Prevents regressing DataTable to "use client", which breaks every Server
 * Component list page (organizer/events, vendor, attendee) by serializing
 * column cell functions and EventModel class instances.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("DataTable RSC guardrails", () => {
  it("DataTable.tsx is a Server Component (no use client)", () => {
    const src = read("src/shared_components/ui/DataTable.tsx");
    const firstNonEmpty =
      src
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0) || "";
    assert.notEqual(firstNonEmpty, '"use client";');
    assert.notEqual(firstNonEmpty, "'use client';");
    assert.equal(src.includes("onRowClick"), false);
  });

  it("ClientDataTable is the client interactive variant", () => {
    const src = read("src/shared_components/ui/ClientDataTable.tsx");
    assert.match(src, /^["']use client["']/m);
    assert.match(src, /onRowClick/);
  });

  it("OrgBoard uses ClientDataTable for row navigation", () => {
    const src = read("src/features/admin/components/OrgBoard.tsx");
    assert.match(src, /ClientDataTable/);
    assert.match(src, /onRowClick/);
    // Must not import DataTable as the clickable table (CellStack/Column types OK).
    assert.equal(/\n\s*<DataTable[\s>]/.test(src), false);
  });
});
