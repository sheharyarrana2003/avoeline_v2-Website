import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkgRoot = path.resolve(path.dirname(require.resolve("../../../../package.json")));

describe("C6 Google provider import boundary", () => {
  it("check-connections-imports exits 0", () => {
    const script = path.join(pkgRoot, "scripts", "check-connections-imports.mjs");
    const result = spawnSync(process.execPath, [script], {
      cwd: pkgRoot,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout || "", /C6 import boundary: ok/);
  });
});
