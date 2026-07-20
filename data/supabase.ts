import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe client (anon key). Safe to import from client or server code.
export const supabase = createClient(url, anonKey);

// Server-only admin client (service-role key). NEVER import this into a client
// component. The service-role key has no NEXT_PUBLIC_ prefix, so it is never
// bundled into the browser; the `?? anonKey` fallback only avoids a hard throw
// if this module is ever evaluated client-side (where it must not actually be used).
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(url, serviceKey ?? anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Two buckets, split by access level. Each media type gets its own FOLDER
// inside the public bucket (banners/, gallery/, speaker-avatars/,
// service-images/, vendor-logos/) so categories are clearly separated in Supabase.
export const MEDIA_BUCKET = "media";
export const CERTIFICATES_BUCKET = "certificates";

/** Create a short-lived signed URL for a file in a private bucket (e.g. certificates). */
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
