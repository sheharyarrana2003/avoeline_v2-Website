#!/usr/bin/env node
/**
 * Read-only usage scan: table snake_case + TABLES.CONST references.
 * Output: docs/schema-inventory/table-usage.json
 */
import fs from "fs";
import { execFileSync } from "child_process";

const tables = JSON.parse(fs.readFileSync("docs/schema-inventory/public-tables.json", "utf8"));

const collectionsSrc = fs.readFileSync("data/collections.ts", "utf8");
const constByTable = new Map();
for (const m of collectionsSrc.matchAll(/([A-Z0-9_]+):\s*"([a-z0-9_]+)"/g)) {
  const [, constName, table] = m;
  if (!constByTable.has(table)) constByTable.set(table, []);
  constByTable.get(table).push(constName);
}

const roots = ["src", "scripts", "emails", "supabase/migrations"];

function rgCount(pattern) {
  try {
    const out = execFileSync(
      "rg",
      [
        "-l",
        "--glob",
        "!**/node_modules/**",
        "--glob",
        "!**/.next/**",
        "--glob",
        "!**/database.types.ts",
        "--glob",
        "!**/collections.ts",
        "-F",
        pattern,
        ...roots,
      ],
      { encoding: "utf8" },
    );
    return out.trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const rows = tables.map((t) => {
  const files = new Set(rgCount(t));
  for (const c of constByTable.get(t) ?? []) {
    for (const f of rgCount(`TABLES.${c}`)) files.add(f);
    for (const f of rgCount(c)) files.add(f);
  }
  const list = [...files].filter(
    (f) => !f.includes("database.types") && !f.includes("collections.ts"),
  );
  return {
    table: t,
    fileCount: list.length,
    consts: constByTable.get(t) ?? [],
    sample: list.slice(0, 8),
  };
});
rows.sort((a, b) => a.fileCount - b.fileCount);
fs.writeFileSync("docs/schema-inventory/table-usage.json", JSON.stringify(rows, null, 2));
const zero = rows.filter((r) => r.fileCount === 0).map((r) => r.table);
const migrationOnly = rows.filter(
  (r) =>
    r.fileCount > 0 &&
    r.sample.every((f) => f.includes("supabase\\migrations") || f.includes("supabase/migrations")),
);
console.log(
  JSON.stringify(
    {
      zero,
      migrationOnly: migrationOnly.map((r) => r.table),
      low: rows
        .filter((r) => r.fileCount > 0 && r.fileCount <= 3)
        .map((r) => ({ t: r.table, n: r.fileCount })),
      total: rows.length,
    },
    null,
    2,
  ),
);
