import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export async function recordPayment(input: {
  payerId?: string | null;
  receiverId?: string | null;
  purpose: "event_registration" | "vendor_booking" | "subscription" | "payout";
  referenceType: string;
  referenceId: string;
  totalAmount: number;
  currency?: string;
  status?: "pending" | "verified" | "failed" | "refunded";
  screenshotUrl?: string | null;
}) {
  const { error } = await supabaseAdmin.from(TABLES.PAYMENTS).insert({
    payer_id: input.payerId || null,
    receiver_id: input.receiverId || null,
    purpose: input.purpose,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    total_amount: input.totalAmount,
    currency: input.currency || "PKR",
    status: input.status || "pending",
    screenshot_url: input.screenshotUrl || null,
  });
  if (error) console.error("[recordPayment]", error);
}
