import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser / non-cookie anon client. */
export const supabase = createClient(url, anonKey);

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
/** Server-only. Never import from a Client Component. */
export const supabaseAdmin: SupabaseClient = createClient(url, serviceKey ?? anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const MEDIA_BUCKET = "media";
export const CERTIFICATES_BUCKET = "certificates";
export const PAYMENT_SCREENSHOTS_BUCKET = "payment-screenshots";

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
  downloadAs?: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, downloadAs ? { download: downloadAs } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** Cookie-bound Supabase client for Auth in Server Components / actions. */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component that cannot set cookies.
        }
      },
    },
  });
}

export function throwIfError<T>(error: { message: string } | null, data: T | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}
