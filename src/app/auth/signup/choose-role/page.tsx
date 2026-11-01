import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { ChooseRoleClient } from "./ChooseRoleClient";

export default async function ChooseRolePage() {
  const user = await AuthService.getCurrentUser();
  if (!user) redirect("/auth/signin?next=/auth/signup/choose-role");

  const { data: profile } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("user_type, setup_complete, onboarding_status")
    .eq("id", user.userId)
    .maybeSingle();

  const existing = String(profile?.user_type || user.userType || "").toLowerCase();
  if (existing === "organizer") {
    if (profile?.onboarding_status === "awaiting_payment") {
      redirect("/auth/signup/awaiting-approval");
    }
    if (profile?.setup_complete) {
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
    redirect("/auth/signup/organizerSetup");
  }
  if (existing === "vendor") {
    if (profile?.onboarding_status === "awaiting_payment") {
      redirect("/auth/signup/awaiting-approval");
    }
    if (profile?.setup_complete) {
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
    redirect("/auth/signup/vendorSetup");
  }
  if (existing === "attendee") redirect(`/attendee/${user.userId}/dashboard`);

  async function saveRole(formData: FormData) {
    "use server";
    const role = String(formData.get("role") || "").toLowerCase();
    if (!["organizer", "vendor", "attendee"].includes(role)) {
      redirect("/auth/signup/choose-role?e=Pick%20a%20role");
    }
    const current = await AuthService.getCurrentUser();
    if (!current) redirect("/auth/signin");
    const now = new Date().toISOString();
    await supabaseAdmin.from(TABLES.USERS).upsert({
      id: current.userId,
      email: current.email,
      full_name: current.name || current.email,
      user_type: role,
      account_status: "active",
      setup_complete: role === "attendee",
      onboarding_status: role === "attendee" ? "complete" : "incomplete",
      updated_at: now,
    });
    if (role === "organizer") {
      await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
        user_id: current.userId,
        org_name: current.name || current.email,
        review_status: "pending",
      });
      redirect("/auth/signup/organizerSetup");
    }
    if (role === "vendor") {
      await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
        user_id: current.userId,
        business_name: current.name || current.email,
        business_email: current.email,
        plan_type: "vendor_free",
        status: "pending",
      });
      redirect("/auth/signup/vendorSetup");
    }
    await supabaseAdmin.from(TABLES.ATTENDEE_PROFILES).upsert({ user_id: current.userId });
    redirect(`/attendee/${current.userId}/dashboard`);
  }

  return <ChooseRoleClient action={saveRole} email={user.email} />;
}
