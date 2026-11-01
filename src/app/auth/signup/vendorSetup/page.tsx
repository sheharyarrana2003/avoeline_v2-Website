import { AuthService, VendorSetupProfileData } from "@/src/features/auth/authService";
import { redirect } from "next/navigation";
import VendorSetupClient from "./VendorSetupClient";
import {
  listPlansForAudience,
  getUserOnboarding,
} from "@/src/features/onboarding/onboarding.service";
import { getPlatformBillingSettings } from "@/src/features/billing/billing.service";
import {
  selectFreePlanAction,
  submitPaidPlanAction,
} from "@/src/features/onboarding/actions/onboarding.action";
import { logger } from "@/src/lib/logger";
import { ConsentFlushClient } from "@/src/features/website/components/ConsentFlushClient";

export default async function SignUpVendorPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect("/auth/signin?next=/auth/signup/vendorSetup");
  }
  const userType = String(user.userType).toLowerCase();
  if (userType !== "vendor") {
    redirect(userType === "organizer" ? "/auth/signup/organizerSetup" : "/auth/signin");
  }

  const onboarding = await getUserOnboarding(user.userId);
  if (onboarding?.onboarding_status === "awaiting_payment") {
    redirect("/auth/signup/awaiting-approval");
  }
  if (onboarding?.onboarding_status === "complete" && onboarding.setup_complete) {
    const { TABLES } = await import("@/data/collections");
    const { supabaseAdmin } = await import("@/data/supabase");
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
    redirect(`/vendor/${user.userId}/dashboard`);
  }

  const { verified: initialVerified } = await AuthService.getEmailVerificationStatus();
  const [plans, billing] = await Promise.all([
    listPlansForAudience("vendor"),
    getPlatformBillingSettings(),
  ]);

  const handleCheckVerification = async () => {
    "use server";
    try {
      return await AuthService.getEmailVerificationStatus();
    } catch (error) {
      logger.error("[vendorSetup] verification check failed", {
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
      logger.error("[vendorSetup] resend verification failed", {
        err: error instanceof Error ? error.message : "unknown",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send the email.",
      };
    }
  };

  const handleSaveProfile = async (data: VendorSetupProfileData) => {
    "use server";
    try {
      const status = await AuthService.getEmailVerificationStatus();
      if (!status.verified) {
        return { success: false, error: "Verify your email before saving your profile." };
      }
      await AuthService.completeVendorSetup(data);
      return { success: true };
    } catch (error) {
      logger.error("[vendorSetup] save profile failed", {
        err: error instanceof Error ? error.message : "unknown",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save vendor profile.",
      };
    }
  };

  const handleSelectFree = async (planKey: string) => {
    "use server";
    return selectFreePlanAction("vendor", planKey);
  };

  const handleSubmitPaid = async (planKey: string, formData: FormData) => {
    "use server";
    return submitPaidPlanAction("vendor", planKey, formData);
  };

  return (
    <>
      <ConsentFlushClient email={user.email || ""} userId={user.userId} role="vendor" />
      <VendorSetupClient
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
