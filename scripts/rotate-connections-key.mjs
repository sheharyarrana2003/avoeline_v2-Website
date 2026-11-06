/**
 * Re-encrypt integration_secrets with a new CONNECTIONS_ENCRYPTION_KEY.
 *
 * Usage:
 *   OLD_KEY=... NEW_KEY=... node scripts/rotate-connections-key.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 * Does not print token plaintext.
 */
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const oldKey = process.env.OLD_KEY?.trim() || process.env.EMAIL_CONNECTION_SECRET?.trim();
const newKey = process.env.NEW_KEY?.trim() || process.env.CONNECTIONS_ENCRYPTION_KEY?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!oldKey || oldKey.length < 16 || !newKey || newKey.length < 16) {
  console.error("Set OLD_KEY and NEW_KEY (min 16 chars each).");
  process.exit(1);
}
if (!url || !service) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (oldKey === newKey) {
  console.error("OLD_KEY and NEW_KEY must differ.");
  process.exit(1);
}

function keyBytes(material) {
  return createHash("sha256").update(material).digest();
}

function decrypt(payload, material) {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("bad payload");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(material),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function encrypt(plain, material) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(material), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

const sb = createClient(url, service, { auth: { persistSession: false } });
const { data, error } = await sb
  .from("integration_secrets")
  .select("connection_id, encrypted_refresh_token, key_version");
if (error) {
  console.error(error.message);
  process.exit(1);
}

let ok = 0;
let fail = 0;
for (const row of data || []) {
  try {
    const plain = decrypt(row.encrypted_refresh_token, oldKey);
    const next = encrypt(plain, newKey);
    const { error: upErr } = await sb
      .from("integration_secrets")
      .update({
        encrypted_refresh_token: next,
        key_version: (row.key_version || 1) + 1,
        rotated_at: new Date().toISOString(),
      })
      .eq("connection_id", row.connection_id);
    if (upErr) throw upErr;
    ok += 1;
  } catch {
    fail += 1;
  }
}

console.log(`Rotated ${ok} secret(s); ${fail} failed.`);
process.exit(fail ? 1 : 0);
