import { AuthService } from "@/src/features/auth/authService";
import { mapSignInAuthError } from "@/src/features/auth/authErrors";
import SignInClient from "./signinClient";
import { redirect } from "next/navigation";
import { CurrentUserData } from "@/src/services/models/user.type";
import { UserService, landingPathFor } from "@/src/services/user.service";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { rateLimit } from "@/src/lib/rateLimit";

/**
 * Only ever follow a same-origin path. `//evil.com` and `/\evil.com` are both
 * treated as absolute URLs by browsers, so an unchecked `next` would be an open
 * redirect.
 */
function safeNext(value: unknown): string | null {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  return path;
}

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Set by the middleware / setup pages when they bounce a signed-out visitor,
  // so signing in returns them to where they were going.
  const nextPath = safeNext((await searchParams)?.next);

  const handleEmailLogin = async (email: string, password: string, next?: string) => {
    "use server";

    // The client sends whatever ?next= is on the URL at submit time; it is
    // untrusted input, so re-validate it here. Falls back to the value bound
    // when this page rendered.
    const target = safeNext(next) ?? nextPath;
    const emailKey = String(email || "")
      .trim()
      .toLowerCase();
    const limited = rateLimit(`login:public:${emailKey || "unknown"}`, 8, 60);
    if (!limited.ok) {
      return {
        success: false,
        error: `Too many sign-in attempts. Try again in ${limited.retryAfterSec}s.`,
      };
    }

    try {
      await AuthService.loginWithEmail(email, password);
      const user: CurrentUserData | null = await AuthService.getCurrentUser();

      if (user === null) {
        return {
          success: false,
          error: "Signed in, but the session could not be read. Try again.",
        };
      }
      const full = await UserService.getUserById(user.userId);
      if (full.mustResetPassword) {
        redirect("/auth/change-password");
      }
      const { getUserOnboarding } = await import("@/src/features/onboarding/onboarding.service");
      const onboarding = await getUserOnboarding(user.userId);
      const ut = String(full.userType || "").toLowerCase();
      if (ut === "organizer" || ut === "vendor") {
        if (onboarding?.onboarding_status === "awaiting_payment") {
          redirect("/auth/signup/awaiting-approval");
        }
        if (!onboarding?.setup_complete || onboarding?.onboarding_status !== "complete") {
          redirect(ut === "vendor" ? "/auth/signup/vendorSetup" : "/auth/signup/organizerSetup");
        }
        // Self-serve profile still pending admin review.
        const { TABLES } = await import("@/data/collections");
        const { supabaseAdmin } = await import("@/data/supabase");
        if (ut === "organizer") {
          const { data: org } = await supabaseAdmin
            .from(TABLES.ORGANIZER_PROFILES)
            .select("review_status")
            .eq("user_id", user.userId)
            .maybeSingle();
          const review = String(org?.review_status || "approved").toLowerCase();
          if (review !== "approved") redirect("/auth/signup/awaiting-approval");
        } else {
          const { data: vendor } = await supabaseAdmin
            .from(TABLES.VENDOR_PROFILES)
            .select("status")
            .eq("user_id", user.userId)
            .maybeSingle();
          const status = String(vendor?.status || "pending").toLowerCase();
          const normalized = status === "active" ? "approved" : status;
          if (normalized === "pending" || normalized === "rejected") {
            redirect("/auth/signup/awaiting-approval");
          }
        }
      }
      if (target) {
        redirect(target);
      } else {
        redirect(landingPathFor(full));
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      return {
        success: false,
        error: mapSignInAuthError(error),
      };
    }
  };

  return <SignInClient handleEmailLogin={handleEmailLogin} />;
}
