import { AuthService } from "@/src/features/auth/authService";

import { redirect } from "next/navigation";
import SignInClient from "./SignupPageClient";
import { CurrentUserData } from "@/src/services/models/user.type";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { logger } from "@/src/lib/logger";
import { recordConsentsAfterAuth } from "@/src/features/website/actions/consent.action";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;

  const handleSubmitLogin = async (formData: unknown) => {
    "use server";

    try {
      const raw = formData as Record<string, unknown>;
      const legalAccepted = Boolean(raw.legalAccepted);
      const communityOptIn = Boolean(raw.communityOptIn);
      if (!legalAccepted) {
        return {
          success: false,
          error: "You must accept the Terms and Privacy Policy to continue.",
        };
      }

      await AuthService.signUpWithEmail({
        name: String(raw.name ?? ""),
        email: String(raw.email ?? ""),
        contactNo: String(raw.contactNo ?? ""),
        gender: String(raw.gender ?? ""),
        country: String(raw.country ?? ""),
        city: String(raw.city ?? ""),
        password: String(raw.password ?? ""),
        userType: String(raw.userType ?? "attendee"),
      });
      const user: CurrentUserData | null = await AuthService.getCurrentUser();

      if (user === null) {
        redirect("/auth/signup");
      }

      const consent = await recordConsentsAfterAuth({
        email: user.email || String(raw.email || ""),
        userId: user.userId,
        role: String(user.userType || raw.userType || "attendee"),
        legalAccepted,
        communityOptIn,
        source: "signup",
      });
      if (!consent.ok) {
        logger.error("[signup] consent failed", { err: consent.error });
      }

      const nextRole = String(user.userType || "").toLowerCase();
      if (nextRole === "organizer") {
        redirect("/auth/signup/organizerSetup");
      }
      if (nextRole === "vendor") {
        redirect("/auth/signup/vendorSetup");
      }
      redirect(`/${nextRole}/${user.userId}/dashboard`);
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      logger.error("[signup] failed", {
        err: error instanceof Error ? error.message : "unknown",
      });

      return {
        success: false,
        error: "Failed to setup an account. Please try again.",
      };
    }
  };

  const parsedRole =
    role === "Vendor" || role === "Attendee" || role === "Organizer" ? role : undefined;

  return <SignInClient handleSubmitLogin={handleSubmitLogin} role={parsedRole} />;
}
