import Link from "next/link";
import { redirect } from "next/navigation";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { getUserOnboarding } from "@/src/features/onboarding/onboarding.service";
import { AuthShell } from "@/src/shared_components/auth/AuthShell";

export default async function AwaitingApprovalPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) redirect("/auth/signin?next=/auth/signup/awaiting-approval");

  const row = await getUserOnboarding(user.userId);
  const ut = String(row?.user_type || user.userType).toLowerCase();
  const awaitingPayment = row?.onboarding_status === "awaiting_payment";
  const setupComplete =
    Boolean(row?.setup_complete) && String(row?.onboarding_status || "") === "complete";

  let reviewPending = false;
  let reviewRejected = false;

  if (ut === "organizer") {
    const { data: org } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("review_status")
      .eq("user_id", user.userId)
      .maybeSingle();
    const review = String(org?.review_status || "approved").toLowerCase();
    reviewPending = review === "pending" || review === "flagged";
    reviewRejected = review === "rejected";
  } else if (ut === "vendor") {
    const { data: vendor } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("status")
      .eq("user_id", user.userId)
      .maybeSingle();
    const status = String(vendor?.status || "pending").toLowerCase();
    const normalized = status === "active" ? "approved" : status;
    reviewPending = normalized === "pending";
    reviewRejected = normalized === "rejected";
  }

  if (setupComplete && !reviewPending && !reviewRejected && !awaitingPayment) {
    redirect(
      ut === "vendor" ? `/vendor/${user.userId}/dashboard` : `/organizer/${user.userId}/dashboard`,
    );
  }

  if (!awaitingPayment && !reviewPending && !reviewRejected) {
    redirect(ut === "vendor" ? "/auth/signup/vendorSetup" : "/auth/signup/organizerSetup");
  }

  const isProfileReview = (reviewPending || reviewRejected) && !awaitingPayment;

  return (
    <AuthShell
      eyebrow={
        awaitingPayment
          ? "Payment received"
          : reviewRejected
            ? "Application closed"
            : "Under review"
      }
      headline={
        awaitingPayment
          ? "Waiting for platform approval"
          : reviewRejected
            ? "Your application was not approved"
            : "Waiting for account approval"
      }
      copy={
        awaitingPayment
          ? "We have your payment screenshot. A SaaS owner will verify it — usually within 1–2 business days. You will get an email when your plan is active."
          : reviewRejected
            ? "An administrator reviewed your account and did not approve it. Contact support if you believe this was a mistake."
            : "Your profile is ready. A platform admin will review it — usually within 1–2 business days. You will get access once it is approved."
      }
    >
      <div className="mt-6 space-y-3 text-sm text-ink-soft">
        {awaitingPayment ? (
          <p>
            Pending plan: <strong className="text-ink">{row?.pending_plan_key || "—"}</strong>
          </p>
        ) : null}
        {isProfileReview ? (
          <p>
            Account type:{" "}
            <strong className="text-ink">{ut === "vendor" ? "Vendor" : "Organizer"}</strong>
          </p>
        ) : null}
        <p>
          Signed in as <strong className="text-ink">{user.email}</strong>
        </p>
        <Link href="/auth/signin" className="inline-block font-medium text-ink underline">
          Sign out and return later
        </Link>
      </div>
    </AuthShell>
  );
}
