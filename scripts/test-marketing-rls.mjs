#!/usr/bin/env node
/**
 * Run supabase/tests/marketing_website_rls.sql against SUPABASE_DB_URL.
 * Fails loudly when the DB URL is missing — never silently skips.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sqlPath = path.join(root, "supabase", "tests", "marketing_website_rls.sql");
const dbUrl = process.env.SUPABASE_DB_URL?.trim();

if (!dbUrl) {
  console.error(
    "[test:sql:marketing] SUPABASE_DB_URL is not set. Export a Postgres connection string (service role / postgres) and re-run.",
  );
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  encoding: "utf8",
  env: process.env,
});

if (result.error) {
  console.error("[test:sql:marketing] Failed to spawn psql:", result.error.message);
  console.error("Install PostgreSQL client tools (psql) or run the SQL file manually.");
  process.exit(1);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error(`[test:sql:marketing] psql exited ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log("[test:sql:marketing] OK —", sqlPath);
// Keep a tiny reference so unused import tooling does not strip awareness of file size.
void sql.length;
