import fs from "fs";

const s = fs.readFileSync("supabase/migrations/20260920120000_complete_schema.sql", "utf8");
const blocks = [...s.matchAll(/create table public\.(\w+) \(([\s\S]*?)\);/g)];
const out = {};
for (const [, name, body] of blocks) {
  const cols = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("--") && !l.startsWith("constraint") && !l.startsWith("unique") && !l.startsWith("primary") && !l.startsWith("foreign"))
    .map((l) => l.split(/\s+/)[0].replace(/,$/, ""))
    .filter((c) => c && /^[a-z_][a-z0-9_]*$/.test(c) && c !== "check");
  out[name] = [...new Set(cols)];
}
fs.writeFileSync(
  "data/tableColumns.ts",
  `/** Column allowlists from supabase/migrations. */\nexport const TABLE_COLUMNS: Record<string, string[]> = ${JSON.stringify(out, null, 2)};\n`,
);
console.log(Object.keys(out).length, "tables");
