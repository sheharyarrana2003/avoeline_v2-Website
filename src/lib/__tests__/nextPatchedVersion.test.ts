import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve("../../../package.json"));

/** Parse leading semver major.minor.patch from a package version string. */
function parseSemver(v: string): [number, number, number] {
  const m = String(v)
    .trim()
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  assert.ok(m, `unparseable version: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function gte(a: [number, number, number], b: [number, number, number]): boolean {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

describe("next patched advisory floor (AUD-1-002)", () => {
  it("package.json next is >= 16.2.11", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      dependencies?: { next?: string };
    };
    const raw = pkg.dependencies?.next || "";
    const ver = parseSemver(raw.replace(/^[^0-9]*/, ""));
    assert.ok(gte(ver, [16, 2, 11]), `next ${raw} is below GHSA floor 16.2.11`);
  });
});
