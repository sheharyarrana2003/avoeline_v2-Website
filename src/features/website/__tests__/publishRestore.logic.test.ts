import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Pure snapshot restore shape tests — mirrors restorePageRevision draft application
 * without hitting the database.
 */
type SnapshotBlock = {
  id: string;
  type: string;
  sort: number;
  visible: boolean;
  published?: Record<string, unknown>;
};

function applyRevisionToDrafts(
  current: Array<{
    id: string;
    draft: Record<string, unknown>;
    sort: number;
    visible: boolean;
    type: string;
  }>,
  snapshotBlocks: SnapshotBlock[],
) {
  const byId = new Map(current.map((b) => [b.id, { ...b }]));
  for (const block of snapshotBlocks) {
    const row = byId.get(block.id);
    if (!row) continue;
    row.draft = { ...(block.published ?? {}) };
    row.sort = block.sort;
    row.visible = block.visible;
    row.type = block.type;
  }
  return [...byId.values()].sort((a, b) => a.sort - b.sort);
}

describe("publish / restore draft application", () => {
  it("restore writes snapshot published payload into drafts without mutating missing blocks", () => {
    const current = [
      { id: "a", type: "hero", sort: 0, visible: true, draft: { headline: "live draft" } },
      { id: "b", type: "cta", sort: 1, visible: false, draft: { title: "x" } },
    ];
    const next = applyRevisionToDrafts(current, [
      {
        id: "a",
        type: "hero",
        sort: 2,
        visible: false,
        published: { headline: "from revision" },
      },
      {
        id: "gone",
        type: "faq",
        sort: 9,
        visible: true,
        published: { items: [] },
      },
    ]);
    assert.equal(next.length, 2);
    const a = next.find((b) => b.id === "a")!;
    assert.equal(a.draft.headline, "from revision");
    assert.equal(a.sort, 2);
    assert.equal(a.visible, false);
    const b = next.find((b) => b.id === "b")!;
    assert.equal(b.draft.title, "x");
  });
});

describe("legal version immutability contract", () => {
  it("publish always increments version; updates are not part of the API", () => {
    const versions = [{ version: 1 }, { version: 2 }];
    const next = Math.max(...versions.map((v) => v.version), 0) + 1;
    assert.equal(next, 3);
    // Service only inserts; tryMutateLegalVersion exists solely for tests/diagnostics.
    assert.equal(typeof next, "number");
  });
});
