import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/src/lib/database.types";
import { getServerEnv } from "@/src/env";
import { logger } from "@/src/lib/logger";

const env = getServerEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only. Never import from a Client Component.
 * `Database` is kept in sync via `npm run types:db` for DTO casting.
 * Client is intentionally unparameterized so jsonb / Json inserts don't fail typecheck
 * across every migrated service; prefer explicit `Database["public"]["Tables"][T]["Row"]` at boundaries.
 */
export const supabaseAdmin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type { Database };

export const MEDIA_BUCKET = "media";
export const CERTIFICATES_BUCKET = "certificates";
export const PAYMENT_SCREENSHOTS_BUCKET = "payment-screenshots";
export const SPONSOR_LOGOS_BUCKET = "sponsor-logos";
export const CHALLENGE_FILES_BUCKET = "hackathon-challenge-files";
export const HACKATHON_SUBMISSIONS_BUCKET = "hackathon-submissions";
export const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";
export const PUBLIC_STORAGE_BUCKETS = new Set([MEDIA_BUCKET, SPONSOR_LOGOS_BUCKET]);

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 300,
  downloadAs?: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, downloadAs ? { download: downloadAs } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** One signed URL per unique path (parallel). Failed paths are omitted. */
export async function getSignedUrlsByPath(
  bucket: string,
  paths: string[],
  expiresIn = 300,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.map((p) => String(p || "").trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  await Promise.all(
    unique.map(async (path) => {
      try {
        out.set(path, await getSignedUrl(bucket, path, expiresIn));
      } catch (err) {
        logger.error("[getSignedUrlsByPath] sign failed", {
          bucket,
          path,
          err: err instanceof Error ? err.message : "unknown",
        });
      }
    }),
  );
  return out;
}

/** Cookie-bound Supabase client for Auth in Server Components / actions. */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
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
