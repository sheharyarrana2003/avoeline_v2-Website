import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export type PlatformBillingSettings = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branch: string;
  jazzcash: string;
  easypaisa: string;
  instructions: string;
  currency: string;
};

const BILLING_COLS =
  "bank_name, account_title, account_number, iban, branch, jazzcash, easypaisa, instructions, currency";

const EMPTY: PlatformBillingSettings = {
  bankName: "",
  accountTitle: "",
  accountNumber: "",
  iban: "",
  branch: "",
  jazzcash: "",
  easypaisa: "",
  instructions:
    "Transfer the plan amount and upload your payment screenshot. Approval may take 1–2 business days.",
  currency: "PKR",
};

export async function getPlatformBillingSettings(): Promise<PlatformBillingSettings> {
  const { data } = await supabaseAdmin
    .from(TABLES.PLATFORM_BILLING_SETTINGS)
    .select(BILLING_COLS)
    .eq("id", 1)
    .maybeSingle();
  if (!data) return EMPTY;
  return {
    bankName: data.bank_name || "",
    accountTitle: data.account_title || "",
    accountNumber: data.account_number || "",
    iban: data.iban || "",
    branch: data.branch || "",
    jazzcash: data.jazzcash || "",
    easypaisa: data.easypaisa || "",
    instructions: data.instructions || EMPTY.instructions,
    currency: data.currency || "PKR",
  };
}

export async function savePlatformBillingSettings(
  input: PlatformBillingSettings,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLES.PLATFORM_BILLING_SETTINGS).upsert({
    id: 1,
    bank_name: input.bankName.trim() || null,
    account_title: input.accountTitle.trim() || null,
    account_number: input.accountNumber.trim() || null,
    iban: input.iban.trim() || null,
    branch: input.branch.trim() || null,
    jazzcash: input.jazzcash.trim() || null,
    easypaisa: input.easypaisa.trim() || null,
    instructions: input.instructions.trim() || null,
    currency: input.currency.trim() || "PKR",
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  });
  if (error) throw error;
}
