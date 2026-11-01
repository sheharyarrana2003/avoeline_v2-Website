"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import {
  getPlatformBillingSettings,
  savePlatformBillingSettings,
} from "@/src/features/billing/billing.service";
import {
  approveSubscriptionPayment,
  rejectSubscriptionPayment,
} from "@/src/features/onboarding/onboarding.service";
import { finishForm } from "@/src/lib/formRedirect";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const billingSettingsSchema = z.object({
  bankName: z.string().max(120),
  accountTitle: z.string().max(120),
  accountNumber: z.string().max(64),
  iban: z.string().max(64),
  branch: z.string().max(120),
  jazzcash: z.string().max(64),
  easypaisa: z.string().max(64),
  instructions: z.string().max(2000),
  currency: z.string().trim().min(3).max(8).default("PKR"),
});

export async function saveBillingSettingsAction(formData: FormData): Promise<void> {
  finishForm(
    formData,
    "/admin/settings/billing",
    await saveBillingImpl(formData),
    "Billing details saved.",
  );
}

async function saveBillingImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("plans");
  if (!admin?.isOwner) return fail("Only the SaaS owner can edit bank details.");

  const section = String(formData.get("section") ?? "all");
  const current = await getPlatformBillingSettings();

  const draft = {
    bankName:
      section === "bank" || section === "all"
        ? String(formData.get("bankName") ?? "")
        : current.bankName,
    accountTitle:
      section === "bank" || section === "all"
        ? String(formData.get("accountTitle") ?? "")
        : current.accountTitle,
    accountNumber:
      section === "bank" || section === "all"
        ? String(formData.get("accountNumber") ?? "")
        : current.accountNumber,
    iban:
      section === "bank" || section === "all" ? String(formData.get("iban") ?? "") : current.iban,
    branch:
      section === "bank" || section === "all"
        ? String(formData.get("branch") ?? "")
        : current.branch,
    instructions:
      section === "bank" || section === "all"
        ? String(formData.get("instructions") ?? "")
        : current.instructions,
    currency:
      section === "bank" || section === "all"
        ? String(formData.get("currency") ?? "PKR") || "PKR"
        : current.currency,
    jazzcash:
      section === "jazzcash" || section === "all"
        ? String(formData.get("jazzcash") ?? "")
        : current.jazzcash,
    easypaisa:
      section === "easypaisa" || section === "all"
        ? String(formData.get("easypaisa") ?? "")
        : current.easypaisa,
  };

  const parsed = billingSettingsSchema.safeParse(draft);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid billing details.");

  await savePlatformBillingSettings(parsed.data, admin.userId);
  revalidatePath("/admin/settings/billing");
  revalidatePath("/auth/signup/organizerSetup");
  revalidatePath("/auth/signup/vendorSetup");
  return ok();
}

export const approveSubscriptionPaymentAction = safeAction({
  input: z.object({ paymentId: z.string().uuid() }),
  run: async ({ paymentId }) => {
    const admin = await AuthService.requireAdmin("tenants");
    if (!admin || !admin.isOwner) {
      return safeFail("FORBIDDEN", "Only the SaaS owner can approve payments.");
    }
    const result = await approveSubscriptionPayment({ paymentId, admin });
    if (!result.ok) return safeFail("FAILED", result.error);
    revalidatePath("/admin/billing/pending");
    revalidatePath("/admin/tenants");
    return safeOk({ approved: true });
  },
});

export const rejectSubscriptionPaymentAction = safeAction({
  input: z.object({
    paymentId: z.string().uuid(),
    reason: z.string().max(500).optional(),
  }),
  run: async ({ paymentId, reason }) => {
    const admin = await AuthService.requireAdmin("tenants");
    if (!admin || !admin.isOwner) {
      return safeFail("FORBIDDEN", "Only the SaaS owner can reject payments.");
    }
    const result = await rejectSubscriptionPayment({ paymentId, admin, reason });
    if (!result.ok) return safeFail("FAILED", result.error);
    revalidatePath("/admin/billing/pending");
    return safeOk({ rejected: true });
  },
});
