import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { logger } from "@/src/lib/logger";
import { maybeBootstrapGoogleWorkspaceFromAuth } from "@/src/features/connections/server/bootstrapFromAuth.service";
import { WORKSPACE_OAUTH_CAPABILITY } from "@/src/features/connections/lib/workspaceScopes.logic";

export const runtime = "nodejs";

function appOrigin(req: NextRequest): string {
  return req.nextUrl.origin;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) to.cookies.set(c.name, c.value);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "";
  const origin = appOrigin(req);

  if (!code) {
    return NextResponse.redirect(new URL("/auth/signin?e=missing_oauth_code", origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const redirectRes = NextResponse.redirect(new URL("/auth/signin", origin));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectRes.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    logger.error("[auth/callback] exchange failed", { err: error?.message });
    return NextResponse.redirect(
      new URL(`/auth/signin?e=${encodeURIComponent(error?.message || "oauth_failed")}`, origin),
    );
  }

  const user = data.user;
  const session = data.session;
  const { data: profile } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, user_type, setup_complete, onboarding_status")
    .eq("id", user.id)
    .maybeSingle();

  const metaType = String(user.user_metadata?.user_type || "").toLowerCase();
  let userType = String(profile?.user_type || metaType || "").toLowerCase();

  if (!profile) {
    const now = new Date().toISOString();
    const email = user.email || "";
    const name = String(
      user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "User",
    );
    if (!userType || !["attendee", "organizer", "vendor"].includes(userType)) {
      // Need role selection
      const pick = NextResponse.redirect(new URL("/auth/signup/choose-role", origin));
      redirectRes.cookies.getAll().forEach((c) => pick.cookies.set(c.name, c.value));
      data.session && (await supabase.auth.getSession());
      // Re-copy cookies from redirectRes
      for (const c of redirectRes.cookies.getAll()) {
        pick.cookies.set(c.name, c.value);
      }
      return pick;
    }
    await supabaseAdmin.from(TABLES.USERS).upsert({
      id: user.id,
      email,
      full_name: name,
      user_type: userType,
      account_status: "active",
      setup_complete: false,
      onboarding_status: "incomplete",
      email_verified: Boolean(user.email_confirmed_at),
      email_verified_at: user.email_confirmed_at || null,
      created_at: now,
      updated_at: now,
    });
    if (userType === "organizer") {
      await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
        user_id: user.id,
        org_name: name,
        review_status: "pending",
      });
    } else if (userType === "vendor") {
      await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
        user_id: user.id,
        business_name: name,
        business_email: email,
        plan_type: "vendor_free",
        status: "pending",
      });
    } else {
      await supabaseAdmin.from(TABLES.ATTENDEE_PROFILES).upsert({ user_id: user.id });
    }
  } else if (!userType) {
    const pick = NextResponse.redirect(new URL("/auth/signup/choose-role", origin));
    for (const c of redirectRes.cookies.getAll()) pick.cookies.set(c.name, c.value);
    return pick;
  } else {
    userType = String(profile.user_type).toLowerCase();
  }

  let dest = "/";
  if (userType === "attendee") {
    dest = `/attendee/${user.id}/dashboard`;
  } else if (userType === "organizer") {
    const complete = profile?.setup_complete || profile?.onboarding_status === "complete";
    dest = complete ? `/organizer/${user.id}/dashboard` : "/auth/signup/organizerSetup";
    if (profile?.onboarding_status === "awaiting_payment") dest = "/auth/signup/awaiting-approval";
    else if (complete) {
      const { data: org } = await supabaseAdmin
        .from(TABLES.ORGANIZER_PROFILES)
        .select("review_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (String(org?.review_status || "approved").toLowerCase() !== "approved") {
        dest = "/auth/signup/awaiting-approval";
      }
    }
  } else if (userType === "vendor") {
    const complete = profile?.setup_complete || profile?.onboarding_status === "complete";
    dest = complete ? `/vendor/${user.id}/dashboard` : "/auth/signup/vendorSetup";
    if (profile?.onboarding_status === "awaiting_payment") dest = "/auth/signup/awaiting-approval";
    else if (complete) {
      const { data: vendor } = await supabaseAdmin
        .from(TABLES.VENDOR_PROFILES)
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      const status = String(vendor?.status || "pending").toLowerCase();
      const normalized = status === "active" ? "approved" : status;
      if (normalized === "pending" || normalized === "rejected") {
        dest = "/auth/signup/awaiting-approval";
      }
    }
  } else if (userType === "platform_admin" || userType === "admin") {
    dest = "/admin";
  }

  if (next.startsWith("/") && !next.startsWith("//")) dest = next;

  // Link Gmail / Calendar / Drive into Connections when possible (organizer/vendor).
  const boot = await maybeBootstrapGoogleWorkspaceFromAuth({
    user,
    session,
    userType,
  }).catch((err) => {
    logger.error("[auth/callback] workspace bootstrap failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { linked: false, needsWorkspaceOAuth: false };
  });

  if (boot.needsWorkspaceOAuth && (userType === "organizer" || userType === "vendor")) {
    const returnTo = encodeURIComponent(dest);
    const loginHint = encodeURIComponent(user.email || "");
    const connectPath = `/api/connections/google/start?capability=${WORKSPACE_OAUTH_CAPABILITY}&ownerType=user&ownerId=${encodeURIComponent(user.id)}&returnTo=${returnTo}&loginHint=${loginHint}`;
    const finalRes = NextResponse.redirect(new URL(connectPath, origin));
    copyCookies(redirectRes, finalRes);
    return finalRes;
  }

  const finalRes = NextResponse.redirect(new URL(dest, origin));
  copyCookies(redirectRes, finalRes);
  return finalRes;
}
