"use server";

import { headers } from "next/headers";
import { createSupabaseServer } from "@/data/supabase";
import { absoluteUrl } from "@/src/lib/appUrl";
import { rateLimit } from "@/src/lib/rateLimit";
import {
  shouldBootstrapGoogleWorkspace,
  WORKSPACE_GOOGLE_SCOPES,
} from "@/src/features/connections/lib/workspaceScopes.logic";

export async function startGoogleAuthAction(input: {
  next?: string;
  /** Prefill role for new Google users (organizer | vendor | attendee). */
  userType?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
    (await headers()).get("x-real-ip") ||
    "anon";
  const limited = rateLimit(`oauth:google:${ip}`, 20, 60);
  if (!limited.ok) {
    return {
      ok: false,
      error: `Too many Google sign-in attempts. Try again in ${limited.retryAfterSec}s.`,
    };
  }

  const supabase = await createSupabaseServer();
  const userType = String(input.userType || "").toLowerCase();
  const nextQ =
    input.next?.startsWith("/") && !input.next.startsWith("//")
      ? `?next=${encodeURIComponent(input.next)}`
      : "";
  const redirectTo = await absoluteUrl(`/auth/callback${nextQ}`);

  const wantWorkspace = shouldBootstrapGoogleWorkspace(userType);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: wantWorkspace ? WORKSPACE_GOOGLE_SCOPES.join(" ") : "openid email profile",
      queryParams: {
        access_type: "offline",
        // consent so Google returns a refresh token we can store in Connections
        prompt: wantWorkspace ? "consent" : "select_account",
        include_granted_scopes: "true",
      },
      ...(userType && ["organizer", "vendor", "attendee"].includes(userType)
        ? { data: { user_type: userType } }
        : {}),
    },
  });
  if (error || !data.url) {
    return { ok: false, error: error?.message || "Could not start Google sign-in." };
  }
  return { ok: true, url: data.url };
}
