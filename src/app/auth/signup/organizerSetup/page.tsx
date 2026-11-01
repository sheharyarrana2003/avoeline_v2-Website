import { AuthService, OrganizerSetupProfileData } from "@/src/features/auth/authService";
import { redirect } from "next/navigation";
import OrganizerSetupClient from "./OrganizerSetupClient";
import { listPlansForAudience } from "@/src/features/onboarding/onboarding.service";
import { getPlatformBillingSettings } from "@/src/features/billing/billing.service";
import {
  selectFreePlanAction,
  submitPaidPlanAction,
} from "@/src/features/onboarding/actions/onboarding.action";
import { getUserOnboarding } from "@/src/features/onboarding/onboarding.service";
import { logger } from "@/src/lib/logger";
import { ConsentFlushClient } from "@/src/features/website/components/ConsentFlushClient";

export default async function SignUpOrganizerPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect("/auth/signin?next=/auth/signup/organizerSetup");
  }
  const userType = String(user.userType).toLowerCase();
  if (userType !== "organizer") {
    redirect(userType === "vendor" ? "/auth/signup/vendorSetup" : "/auth/signin");
  }

  const onboarding = await getUserOnboarding(user.userId);
  if (onboarding?.onboarding_status === "awaiting_payment") {
    redirect("/auth/signup/awaiting-approval");
  }
  if (onboarding?.onboarding_status === "complete" && onboarding.setup_complete) {
    const { TABLES } = await import("@/data/collections");
    const { supabaseAdmin } = await import("@/data/supabase");
    const { data: org } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("review_status")
      .eq("user_id", user.userId)
      .maybeSingle();
    if (String(org?.review_status || "approved").toLowerCase() !== "approved") {
      redirect("/auth/signup/awaiting-approval");
    }
    redirect(`/organizer/${user.userId}/dashboard`);
  }

  const { verified: initialVerified } = await AuthService.getEmailVerificationStatus();
  const [plans, billing] = await Promise.all([
    listPlansForAudience("organizer"),
    getPlatformBillingSettings(),
  ]);

  const handleCheckVerification = async () => {
    "use server";
    try {
      return await AuthService.getEmailVerificationStatus();
    } catch (error) {
      logger.error("[organizerSetup] verification check failed", {
        err: error instanceof Error ? error.message : "unknown",
      });
      return { verified: false };
    }
  };

  const handleResendVerification = async () => {
    "use server";
    try {
      return await AuthService.resendVerificationEmail();
    } catch (error) {
      logger.error("[organizerSetup] resend verification failed", {
        err: error instanceof Error ? error.message : "unknown",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send the email.",
      };
    }
  };

  const handleSaveProfile = async (data: OrganizerSetupProfileData) => {
    "use server";
    try {
      const status = await AuthService.getEmailVerificationStatus();
      if (!status.verified) {
        return { success: false, error: "Verify your email before saving your profile." };
      }
      await AuthService.completeOrganizerSetup(data);
      return { success: true };
    } catch (error) {
      logger.error("[organizerSetup] save profile failed", {
        err: error instanceof Error ? error.message : "unknown",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save organizer profile.",
      };
    }
  };

  const handleSelectFree = async (planKey: string) => {
    "use server";
    return selectFreePlanAction("organizer", planKey);
  };

  const handleSubmitPaid = async (planKey: string, formData: FormData) => {
    "use server";
    return submitPaidPlanAction("organizer", planKey, formData);
  };

  return (
    <>
      <ConsentFlushClient email={user.email || ""} userId={user.userId} role="organizer" />
      <OrganizerSetupClient
        email={user.email || ""}
        initialVerified={initialVerified}
        plans={plans}
        billing={billing}
        onCheckVerification={handleCheckVerification}
        onResendVerification={handleResendVerification}
        onSaveProfile={handleSaveProfile}
        onSelectFreePlan={handleSelectFree}
        onSubmitPaidPlan={handleSubmitPaid}
      />
    </>
  );
}
