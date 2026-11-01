import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { TABLES } from "@/data/collections";

const all_possible_roles = ["organizer", "vendor", "attendee"];

function redirectToSignIn(request: NextRequest) {
  const isAdminBound = request.nextUrl.pathname.startsWith("/admin");
  const url = new URL(isAdminBound ? "/admin/signin" : "/auth/signin", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

const PUBLIC_PATHS = ["/admin/signin"];

export async function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return redirectToSignIn(request);
  }

  const { data: profile } = await supabase
    .from(TABLES.USERS)
    .select("id, user_type, must_reset_password, setup_complete, onboarding_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.must_reset_password &&
    !request.nextUrl.pathname.startsWith("/auth/change-password")
  ) {
    return NextResponse.redirect(new URL("/auth/change-password", request.url));
  }

  const dbType = String(profile?.user_type ?? "").toLowerCase();
  const userType = dbType === "platform_admin" ? "admin" : dbType;
  const roleId = user.id;

  if (!userType) {
    return redirectToSignIn(request);
  }

  if (userType === "admin") {
    return response;
  }

  // Organizer/vendor onboarding gates (setup + payment pending + profile review).
  if (userType === "organizer" || userType === "vendor") {
    const path = request.nextUrl.pathname;
    const onboardingOk =
      path.startsWith("/auth/signup/organizerSetup") ||
      path.startsWith("/auth/signup/vendorSetup") ||
      path.startsWith("/auth/signup/awaiting-approval") ||
      path.startsWith("/auth/signup/choose-role") ||
      path.startsWith("/auth/change-password") ||
      path.startsWith("/auth/callback");
    const status = String(profile?.onboarding_status || "incomplete");
    const setupDone = Boolean(profile?.setup_complete) && status === "complete";

    if (status === "awaiting_payment" && !path.startsWith("/auth/signup/awaiting-approval")) {
      return NextResponse.redirect(new URL("/auth/signup/awaiting-approval", request.url));
    }
    if (
      !setupDone &&
      status !== "awaiting_payment" &&
      (path.startsWith("/organizer") || path.startsWith("/vendor")) &&
      !onboardingOk
    ) {
      const setup =
        userType === "vendor" ? "/auth/signup/vendorSetup" : "/auth/signup/organizerSetup";
      return NextResponse.redirect(new URL(setup, request.url));
    }

    // Self-serve profile review: organizers (review_status) and vendors (status).
    if (
      setupDone &&
      (path.startsWith("/organizer") || path.startsWith("/vendor")) &&
      !path.startsWith("/auth/signup/awaiting-approval")
    ) {
      if (userType === "organizer") {
        const { data: orgProfile } = await supabase
          .from(TABLES.ORGANIZER_PROFILES)
          .select("review_status")
          .eq("user_id", user.id)
          .maybeSingle();
        const review = String(orgProfile?.review_status || "approved").toLowerCase();
        if (review !== "approved") {
          return NextResponse.redirect(new URL("/auth/signup/awaiting-approval", request.url));
        }
      } else {
        const { data: vendorProfile } = await supabase
          .from(TABLES.VENDOR_PROFILES)
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();
        const vendorStatus = String(vendorProfile?.status || "pending").toLowerCase();
        const normalized = vendorStatus === "active" ? "approved" : vendorStatus;
        if (normalized === "pending" || normalized === "rejected") {
          return NextResponse.redirect(new URL("/auth/signup/awaiting-approval", request.url));
        }
      }
    }
  }

  for (const role of all_possible_roles) {
    if (request.nextUrl.pathname.startsWith(`/${role}`) && userType !== role) {
      const staffEvent = request.nextUrl.pathname.match(/^\/organizer\/[^/]+\/events\/([^/]+)/);
      if (role === "organizer" && staffEvent?.[1]) {
        const { data: isStaff } = await supabase.rpc("user_is_event_staff", {
          p_event_id: staffEvent[1],
        });
        if (isStaff === true) return response;
      }
      if (all_possible_roles.includes(userType)) {
        return NextResponse.redirect(new URL(`/${userType}/${roleId}/dashboard`, request.url));
      }
      return redirectToSignIn(request);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/organizer/:path*",
    "/vendor/:path*",
    "/attendee/:path*",
    "/admin",
    "/admin/:path*",
    "/department",
    "/department/:path*",
    "/clubs/:path*",
    "/auth/change-password",
    "/auth/signup/awaiting-approval",
  ],
};
