// One-off: create (or reset) the SaaS owner accounts.
// Run with:  npm run seed:owners
//
// Reads from .env.local (never printed):
//   SAAS_OWNER_EMAILS=a@x.com,b@y.com
//   SAAS_OWNER_PASSWORD_1=...   (password for the first email)
//   SAAS_OWNER_PASSWORD_2=...   (password for the second email, and so on)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const emails = String(process.env.SAAS_OWNER_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
if (!emails.length) {
  console.error("Set SAAS_OWNER_EMAILS in .env.local (comma-separated).");
  process.exit(1);
}

const ADMIN_AREAS = ["organizers", "events", "vendors", "support", "categories"];
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findUserId(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

let failed = false;
for (const [i, email] of emails.entries()) {
  const password = process.env[`SAAS_OWNER_PASSWORD_${i + 1}`];
  if (!password || password.length < 8) {
    console.error(`✗ ${email}: set SAAS_OWNER_PASSWORD_${i + 1} (8+ characters) in .env.local`);
    failed = true;
    continue;
  }

  try {
    let id = await findUserId(email);
    if (id) {
      const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true, ban_duration: "none" });
      if (error) throw error;
      console.log(`• ${email}: existing Auth user, password updated`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "SaaS Owner" },
      });
      if (error || !data.user) throw error ?? new Error("createUser returned no user");
      id = data.user.id;
      console.log(`✓ ${email}: Auth user created`);
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await admin.from("users").upsert({
      id,
      email,
      user_type: "platform_admin",
      account_status: "active",
      is_owner: true,
      admin_permissions: ADMIN_AREAS,
      must_reset_password: false,
      setup_complete: true,
      email_verified: true,
      updated_at: now,
    });
    if (upsertError) throw upsertError;
    console.log(`✓ ${email}: platform owner`);
  } catch (err) {
    console.error(`✗ ${email}:`, err?.message ?? err);
    failed = true;
  }
}

console.log(failed ? "Finished with errors." : "Done. Sign in at /admin/signin.");
process.exit(failed ? 1 : 0);
