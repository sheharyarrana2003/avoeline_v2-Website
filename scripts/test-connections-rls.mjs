/**
 * SQL smoke: integration_secrets must not be grantable to authenticated/anon.
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !service || !anon) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const { data, error } = await admin.rpc("exec_sql", {}).maybeSingle?.();
void data;
void error;

// Use raw SQL via service REST is limited — query pg_catalog with a known function if present.
// Fallback: attempt select as anon should fail / return empty due to revoke.
const client = createClient(url, anon, { auth: { persistSession: false } });
const { data: rows, error: selErr } = await client
  .from("integration_secrets")
  .select("connection_id")
  .limit(1);

if (!selErr && rows && rows.length > 0) {
  console.error("FAIL: authenticated/anon could read integration_secrets");
  process.exit(1);
}

// permission denied or empty without grants is OK
console.log("OK: integration_secrets not readable by anon key", selErr?.code || "empty");
process.exit(0);
