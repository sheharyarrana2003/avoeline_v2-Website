// Delete ALL public table rows, Storage objects, and Auth users.
// Does NOT export or move data. Does NOT drop schema/columns/buckets.
// Does NOT run seed:owners — do that yourself after.
//
//   CONFIRM=YES npm run reset:wipe-data
//
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

if (String(process.env.CONFIRM || "").toUpperCase() !== "YES") {
  console.error(
    "Refusing to run. Set CONFIRM=YES to wipe all table rows, Storage files, and Auth users.",
  );
  console.error('Example (PowerShell): $env:CONFIRM="YES"; npm run reset:wipe-data');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const KNOWN_BUCKETS = [
  "media",
  "certificates",
  "payment-screenshots",
  "sponsor-logos",
  "hackathon-challenge-files",
  "hackathon-submissions",
  "support-attachments",
  "expense-receipts",
];

async function listAllObjectPaths(bucket) {
  const paths = [];
  async function walk(prefix) {
    let offset = 0;
    const limit = 100;
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      if (!data?.length) break;
      for (const entry of data) {
        const full = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Files usually have metadata; folders typically do not — recurse folders.
        if (entry.metadata != null || entry.id != null) {
          paths.push(full);
        } else {
          await walk(full);
        }
      }
      if (data.length < limit) break;
      offset += limit;
    }
  }
  await walk("");
  return paths;
}

async function emptyBucket(bucket) {
  let removed = 0;
  for (;;) {
    const paths = await listAllObjectPaths(bucket);
    if (!paths.length) break;
    // remove in chunks of 100
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error } = await admin.storage.from(bucket).remove(chunk);
      if (error) throw error;
      removed += chunk.length;
    }
    // if listing still returns the same (race), break after one pass when empty next loop
    if (paths.length < 100) {
      const again = await listAllObjectPaths(bucket);
      if (!again.length) break;
    }
  }
  return removed;
}

async function emptyAllStorage() {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;
  const names = new Set([...(buckets ?? []).map((b) => b.name), ...KNOWN_BUCKETS]);
  let total = 0;
  for (const name of names) {
    try {
      const n = await emptyBucket(name);
      if (n > 0) console.log(`• storage "${name}": removed ${n} object(s)`);
      total += n;
    } catch (err) {
      // Missing bucket is fine
      const msg = err?.message || String(err);
      if (/not found|Bucket not found/i.test(msg)) continue;
      console.warn(`• storage "${name}": ${msg}`);
    }
  }
  return total;
}

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < 200) break;
  }
  return users;
}

async function main() {
  console.log("Wiping Storage objects…");
  const storageRemoved = await emptyAllStorage();
  console.log(`Storage done (${storageRemoved} object(s) removed).`);

  console.log("Truncating all public table rows…");
  const { error: wipeErr } = await admin.rpc("reset_wipe_all_public_data");
  if (wipeErr) throw wipeErr;
  console.log("Public tables truncated.");

  console.log("Deleting all Auth users…");
  const authUsers = await listAllAuthUsers();
  let authDeleted = 0;
  let authFailed = 0;
  for (const u of authUsers) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) {
      console.warn(`• auth delete ${u.email || u.id}: ${error.message}`);
      authFailed += 1;
    } else {
      authDeleted += 1;
    }
  }
  console.log(`Auth done (deleted ${authDeleted}, failed ${authFailed}).`);

  console.log("");
  console.log("Wipe complete. Schema and Storage buckets remain.");
  console.log("Next: npm run seed:owners");
  console.log("Then: /admin/signin → Seed categories if needed → optional npm run seed:demo");
}

main().catch((err) => {
  console.error("Wipe failed:", err?.message ?? err);
  process.exit(1);
});
