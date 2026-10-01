// One-off: create the Supabase Storage buckets this app uses.
// Run with:  npm run setup:buckets
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const buckets = [
  { name: "media", options: { public: true } },
  { name: "certificates", options: { public: false } },
  { name: "payment-screenshots", options: { public: false } },
];

for (const b of buckets) {
  const { error } = await admin.storage.createBucket(b.name, b.options);
  if (error) {
    if (/already exists/i.test(error.message)) {
      console.log(`• bucket "${b.name}" already exists — skipping`);
    } else {
      console.error(`✗ failed to create "${b.name}":`, error.message);
      process.exit(1);
    }
  } else {
    console.log(`✓ created bucket "${b.name}" (public: ${b.options.public})`);
  }
}

console.log("Done.");
process.exit(0);
